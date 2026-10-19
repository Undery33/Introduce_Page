#!/usr/bin/env python3
"""Deploy the prepared administrator release to the existing undery-web service.

Default: read-only preflight. --apply backs up/restores a trial database, migrates
production, validates a candidate, then switches the service with rollback.
"""

import argparse
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import stat
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
NODE = Path("/opt/personal-site/node-v24.20.0-linux-x64/bin/node")
WEB = Path("/opt/personal-site/web")
CURRENT = WEB / "current"
NGINX = Path("/etc/nginx/sites-available/undery.link")
UNIT = Path("/etc/systemd/system/undery-web.service")
DROPIN = Path("/etc/systemd/system/undery-web.service.d/admin.conf")
BACKUPS = Path("/var/backups/undery-site")
APP_ENV = Path("/etc/undery/app.env")
TEST_ENV = Path("/etc/undery/test.env")
LOG = None


class DeployError(Exception):
    pass


def clean_environment():
    environment = dict(os.environ)
    for name in ["DATABASE_URL", "ADMIN_TEST_DATABASE_URL", "SITE_URL", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "ADMIN_GITHUB_ID", "NODE_OPTIONS", "SMOKE_BASE_URL", "EXPECTED_COMMIT", "MEDIA_DIRECTORY"]:
        environment.pop(name, None)
    return environment


def run(arguments, *, environment=None, input_file=None, output_file=None, timeout=180, public_artifacts=False):
    try:
        result = subprocess.run(
            [str(value) for value in arguments], cwd=ROOT,
            env=environment if environment is not None else clean_environment(),
            stdin=input_file, stdout=output_file if output_file is not None else subprocess.PIPE,
            stderr=subprocess.PIPE, timeout=timeout, check=False,
            umask=0o022 if public_artifacts else -1,
        )
    except (OSError, subprocess.TimeoutExpired):
        raise DeployError(f"명령 실행/시간 제한 오류: {Path(arguments[0]).name}") from None
    if LOG is not None:
        if result.stdout:
            LOG.write(result.stdout)
        if result.stderr:
            LOG.write(result.stderr)
        LOG.flush()
    if result.returncode:
        raise DeployError(f"명령 실패: {Path(arguments[0]).name} (exit {result.returncode}). 자세한 출력은 비공개 배포 로그에 보관됩니다.")
    return (result.stdout or b"").decode("utf-8").strip()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def atomic_file(path, contents, mode=0o644):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as handle:
        temporary = Path(handle.name)
        handle.write(contents)
    try:
        temporary.chmod(mode)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def switch_release(link, target):
    if not link.is_symlink() or not target.is_dir():
        raise DeployError("기존 release 링크와 대상 디렉터리를 확인해야 합니다.")
    temporary = link.with_name(link.name + ".pending-" + str(os.getpid()))
    if temporary.exists() or temporary.is_symlink():
        raise DeployError("이전 링크 교체 작업이 남아 있습니다.")
    temporary.symlink_to(target)
    try:
        temporary.replace(link)
    finally:
        temporary.unlink(missing_ok=True)


def verify_source(manifest):
    for name, expected in manifest["files"].items():
        path = ROOT / name
        if path.is_symlink() or not path.is_file():
            raise DeployError(f"소스 파일 누락/링크: {name}")
        content = path.read_bytes()
        actual = hashlib.sha1(b"blob " + str(len(content)).encode() + b"\0" + content).hexdigest()
        if actual != expected:
            raise DeployError(f"검증한 커밋과 소스가 다릅니다: {name}")
    for name in [".env", ".env.local", ".env.production", ".env.production.local"]:
        if (ROOT / name).exists():
            raise DeployError("빌드 checkout에 실제 환경 파일이 있습니다. 운영 설정은 /etc/undery에만 둡니다.")


def check_private_file(path):
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or stat.S_IMODE(info.st_mode) != 0o600:
        raise DeployError(f"root 소유 0600 일반 파일이 필요합니다: {path}")


def health(port, commit, database=True, attempts=40):
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    for _ in range(attempts):
        try:
            with opener.open(f"http://127.0.0.1:{port}/api/health", timeout=2) as response:
                data = json.load(response)
            if data.get("status") == "ok" and data.get("commit") == commit:
                if not database or data.get("checks", {}).get("database") == "ok" and data.get("checks", {}).get("authentication") == "configured":
                    return data
        except (OSError, ValueError, urllib.error.URLError):
            pass
        time.sleep(1)
    raise DeployError(f"포트 {port}의 앱/DB/인증 설정 상태 검사가 실패했습니다.")


def preflight(manifest):
    if os.geteuid() != 0:
        raise DeployError("서버 root 터미널에서 실행해야 합니다.")
    verify_source(manifest)
    previous = WEB / "releases" / manifest["previous_release"]
    if not CURRENT.is_symlink() or CURRENT.resolve() != previous or not previous.is_dir():
        raise DeployError("현재 release가 사전에 확인한 버전과 다릅니다. 덮어쓰지 않고 중단합니다.")
    if NGINX.is_symlink() or digest(NGINX) != manifest["previous_nginx_sha256"]:
        raise DeployError("현재 Nginx 설정이 사전에 확인한 내용과 다릅니다.")
    if digest(UNIT) != manifest["previous_service_sha256"]:
        raise DeployError("현재 systemd 서비스 설정이 사전에 확인한 내용과 다릅니다.")
    if Path("/etc/nginx/sites-enabled/undery.link").resolve() != NGINX:
        raise DeployError("활성 Nginx 설정 경로가 다릅니다.")
    if manifest.get("previous_dropin_sha256") and (not DROPIN.is_file() or digest(DROPIN) != manifest["previous_dropin_sha256"]):
        raise DeployError("현재 관리자 drop-in이 확인한 버전과 다릅니다.")
    if DROPIN.is_symlink():
        raise DeployError("관리자 drop-in이 심볼릭 링크입니다.")
    if BACKUPS.is_symlink() or BACKUPS.exists() and (not BACKUPS.is_dir() or BACKUPS.stat().st_uid != 0 or BACKUPS.stat().st_mode & 0o022):
        raise DeployError("백업 경로는 root 소유이며 다른 사용자가 쓸 수 없는 디렉터리여야 합니다.")
    dropins = run(["systemctl", "show", "undery-web", "--property=DropInPaths", "--value"]).split()
    if any(path != str(DROPIN) for path in dropins):
        raise DeployError("다른 systemd drop-in이 있습니다. 적용 순서를 먼저 검토해야 합니다.")
    run(["systemctl", "is-active", "--quiet", "undery-web"])
    run(["nginx", "-t"])
    check_private_file(APP_ENV)
    check_private_file(TEST_ENV)
    # Validate privately; no credential values are returned to the terminal.
    validation = '''
      import {parseEnv} from 'node:util';
      import {readFileSync} from 'node:fs';
      import assert from 'node:assert/strict';
      const app = parseEnv(readFileSync('/etc/undery/app.env', 'utf8'));
      const test = parseEnv(readFileSync('/etc/undery/test.env', 'utf8'));
      try {
        const u = new URL(app.DATABASE_URL), t = new URL(test.DATABASE_URL);
        assert(u.protocol === 'postgresql:' && u.hostname === '127.0.0.1' && u.port === '5432' && u.pathname === '/undery' && u.username === 'undery' && u.password && !u.search);
        assert(t.protocol === u.protocol && t.hostname === u.hostname && t.port === u.port && t.pathname === '/undery_test' && t.username === u.username && t.password === u.password && !t.search);
        assert(test.ADMIN_TEST_DATABASE_URL === test.DATABASE_URL);
        assert(app.MEDIA_DIRECTORY === undefined || app.MEDIA_DIRECTORY === "/var/lib/undery-media");
        assert(app.SITE_URL === 'https://undery.link' && app.ADMIN_GITHUB_ID === '127064386' && app.GITHUB_CLIENT_ID && app.GITHUB_CLIENT_SECRET);
      } catch { console.error('DB/OAuth 환경 설정을 확인하십시오.'); process.exit(1); }
    '''
    run([NODE, "--input-type=module", "-e", validation])
    ids = run(["docker", "ps", "-q", "--filter", "label=com.docker.compose.project=undery-site", "--filter", "label=com.docker.compose.service=db"]).splitlines()
    if len(ids) != 1 or run(["docker", "inspect", "--format", "{{.State.Health.Status}}", ids[0]]) != "healthy":
        raise DeployError("준비한 PostgreSQL 컨테이너 한 개가 healthy 상태여야 합니다.")
    for port in ([3101, 3102, 3103] if manifest.get("media") else [3101, 3102]):
        try:
            with socket.socket() as probe:
                probe.bind(("127.0.0.1", port))
        except OSError:
            raise DeployError(f"시험 포트 {port}를 사용할 수 없습니다.") from None
    return ids[0]


def rollback(backup):
    backup = backup.resolve()
    if backup.parent != BACKUPS or not backup.name.startswith("deploy-"):
        raise DeployError("이 작업의 배포 백업 경로만 복구할 수 있습니다.")
    check_private_file(backup / "state.json")
    state = json.loads((backup / "state.json").read_text())
    old, new = Path(state["old_release"]), Path(state["new_release"])
    if old.parent != WEB / "releases" or new.parent != WEB / "releases" or not old.is_dir():
        raise DeployError("복구할 release 경로가 올바르지 않습니다.")
    if not CURRENT.is_symlink() or CURRENT.resolve() not in [old, new]:
        raise DeployError("이 배포 이후 current가 변경되었습니다. 자동 복구를 중단합니다.")
    if digest(NGINX) not in [state["old_nginx_sha256"], state["new_nginx_sha256"]]:
        raise DeployError("이 배포 이후 Nginx 파일이 변경되었습니다. 자동 복구를 중단합니다.")
    if DROPIN.exists() and digest(DROPIN) not in [state["old_dropin_sha256"], state["new_dropin_sha256"]]:
        raise DeployError("이 배포 이후 systemd drop-in이 변경되었습니다.")
    atomic_file(NGINX, (backup / "nginx.conf").read_bytes())
    if state["had_dropin"]:
        atomic_file(DROPIN, (backup / "admin.conf").read_bytes())
    else:
        DROPIN.unlink(missing_ok=True)
    switch_release(CURRENT, old)
    run(["nginx", "-t"])
    run(["systemctl", "daemon-reload"])
    run(["systemctl", "restart", "undery-web"])
    run(["systemctl", "reload", "nginx"])
    health(3000, state["previous_commit"], database=False)
    print("복구 완료: 이전 release와 웹 설정. 운영 DB 데이터는 유지했습니다.", flush=True)


def apply(manifest, container):
    global LOG
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    BACKUPS.mkdir(parents=True, exist_ok=True, mode=0o700)
    backup = BACKUPS / ("deploy-" + stamp)
    backup.mkdir(mode=0o700)
    LOG = (backup / "deployment.log").open("xb")
    commit = manifest["commit"]
    release = WEB / "releases" / (commit + "-admin-" + stamp)
    original_nginx = NGINX.read_bytes()
    new_nginx = (ROOT / "deploy/nginx/undery.link.conf").read_bytes()
    new_dropin = ("# undery-admin-deploy\n[Service]\nEnvironmentFile=/etc/undery/app.env\nEnvironment=BUILD_COMMIT=" + commit + "\n").encode()
    if manifest.get("media"):
        new_dropin += b"StateDirectory=undery-media\nStateDirectoryMode=0700\nEnvironment=MEDIA_DIRECTORY=/var/lib/undery-media\n"
    state = {
        "old_release": str(CURRENT.resolve()), "new_release": str(release),
        "previous_commit": manifest.get("previous_commit", manifest["previous_release"]), "commit": commit,
        "had_dropin": DROPIN.exists(), "old_dropin_sha256": digest(DROPIN) if DROPIN.exists() else None,
        "new_dropin_sha256": hashlib.sha256(new_dropin).hexdigest(),
        "old_nginx_sha256": hashlib.sha256(original_nginx).hexdigest(),
        "new_nginx_sha256": hashlib.sha256(new_nginx).hexdigest(),
    }
    atomic_file(backup / "nginx.conf", original_nginx, 0o600)
    if DROPIN.exists():
        atomic_file(backup / "admin.conf", DROPIN.read_bytes(), 0o600)
    atomic_file(backup / "state.json", (json.dumps(state, indent=2) + "\n").encode(), 0o600)
    print(f"백업/비공개 로그: {backup}", flush=True)
    changed_web = False
    candidate = None
    try:
        print("1/5 소스 확인 · 배포 커밋 빌드 · HTTP/시험 DB 검사", flush=True)
        build_environment = {**clean_environment(), "NODE_ENV": "production", "BUILD_COMMIT": commit, "SITE_URL": "https://undery.link", "NEXT_TELEMETRY_DISABLED": "1"}
        run([NODE, ROOT / "node_modules/prisma/build/index.js", "generate"], environment=build_environment, public_artifacts=True)
        run([NODE, ROOT / "node_modules/next/dist/bin/next", "build", "--webpack"], environment=build_environment, timeout=600, public_artifacts=True)
        run([NODE, ROOT / "scripts/prepare-standalone.mjs"], environment=build_environment, public_artifacts=True)
        verify_source(manifest)
        smoke_environment = {**build_environment, "EXPECTED_COMMIT": commit, "SMOKE_PORT": "3101"}
        result = run([NODE, ROOT / "scripts/smoke.mjs"], environment=smoke_environment)
        print(next((line for line in result.splitlines() if line.startswith("PASS:")), "HTTP 검사 통과"), flush=True)
        if manifest.get("media"):
            run([NODE, "--env-file=" + str(TEST_ENV), ROOT / "node_modules/prisma/build/index.js", "migrate", "deploy"])
        run([NODE, "--env-file=" + str(TEST_ENV), "--import", "tsx", "--test", "--test-isolation=none", "tests/integration/admin-database.test.ts"])
        if manifest.get("media"):
            result = run([NODE, "--env-file=" + str(TEST_ENV), "--import", "tsx", "--test", "--test-isolation=none", "tests/integration/media-http.test.ts"])
            print(next((line for line in result.splitlines() if "authenticated media HTTP checks" in line), "이미지/사진 인증 HTTP 검사 통과"), flush=True)

        print("2/5 운영 DB 백업 · 별도 DB 복원 확인", flush=True)
        archive = backup / "undery-before-migration.dump"
        with archive.open("xb") as destination:
            run(["docker", "exec", container, "pg_dump", "-U", "postgres", "-d", "undery", "-Fc"], output_file=destination)
        restore_db = "undery_restore_" + stamp.lower()
        run(["docker", "exec", container, "createdb", "-U", "postgres", "-O", "undery", restore_db])
        with archive.open("rb") as source:
            run(["docker", "exec", "-i", container, "pg_restore", "-U", "postgres", "-d", restore_db, "--exit-on-error", "--no-owner", "--no-acl", "--role", "undery"], input_file=source)
        if manifest.get("media"):
            # Try the additive migration on a restored production snapshot first.
            migration_check = """
              const {spawnSync} = require('node:child_process');
              const u = new URL(process.env.DATABASE_URL);
              u.pathname = '/' + process.argv[1];
              const result = spawnSync(process.execPath, [process.argv[2], 'migrate', 'deploy'], {
                env: {...process.env, DATABASE_URL: u.href}, stdio: 'inherit'
              });
              process.exit(result.status ?? 1);
            """
            run([NODE, "--env-file=" + str(APP_ENV), "-e", migration_check, restore_db, ROOT / "node_modules/prisma/build/index.js"])
        # Only this invocation's successfully restored disposable DB is removed.
        run(["docker", "exec", container, "dropdb", "-U", "postgres", restore_db])

        print("3/5 운영 migration · 새 release 준비", flush=True)
        run([NODE, "--env-file=" + str(APP_ENV), ROOT / "node_modules/prisma/build/index.js", "migrate", "deploy"])
        bundle = ROOT / ".next/standalone"
        if any(path.name.startswith(".env") for path in bundle.iterdir()):
            raise DeployError("standalone에 환경 파일이 포함되어 있어 배포를 중단합니다.")
        if any(path.is_symlink() for path in bundle.rglob("*")):
            raise DeployError("standalone 내부 링크는 별도 검토가 필요합니다.")
        shutil.copytree(bundle, release, ignore=lambda path, names: ["cache"] if Path(path) == bundle / ".next" else [])
        for path in [release, *release.rglob("*")]:
            path.chmod(0o755 if path.is_dir() or path.stat().st_mode & 0o111 else 0o644)
        (release / ".next/cache").mkdir(parents=True, exist_ok=True, mode=0o755)

        print("4/5 운영 DB 연결 후보 서버 검사", flush=True)
        candidate_env = {**clean_environment(), "NODE_ENV": "production", "HOSTNAME": "127.0.0.1", "PORT": "3102", "BUILD_COMMIT": commit}
        if manifest.get("media"):
            candidate_media = backup / "candidate-media"
            candidate_media.mkdir(mode=0o700)
            candidate_env["MEDIA_DIRECTORY"] = str(candidate_media)
        candidate = subprocess.Popen([str(NODE), "--env-file=" + str(APP_ENV), str(release / "server.js")], cwd=release, env=candidate_env, stdout=LOG, stderr=LOG)
        candidate_health = health(3102, commit)
        if manifest.get("media") and candidate_health.get("checks", {}).get("media") != "ok":
            raise DeployError("후보 서버의 사진 저장소 검사가 실패했습니다.")
        if candidate.poll() is not None:
            raise DeployError("후보 서버 프로세스가 종료되었습니다.")
        admin = run(["curl", "--fail", "--silent", "--max-time", "10", "http://127.0.0.1:3102/admin"])
        if "GitHub로 로그인" not in admin:
            raise DeployError("후보 서버의 관리자 로그인 화면을 확인하지 못했습니다.")
        candidate.terminate()
        candidate.wait(timeout=15)
        candidate = None

        print("5/5 Nginx 설정 검사 · release 전환 · 서비스 상태 확인", flush=True)
        if CURRENT.resolve() != Path(state["old_release"]) or digest(NGINX) != state["old_nginx_sha256"] or (digest(DROPIN) if DROPIN.exists() else None) != state["old_dropin_sha256"]:
            raise DeployError("준비 중 운영 설정이 바뀌었습니다. 전환을 중단합니다.")
        changed_web = True
        atomic_file(NGINX, new_nginx)
        run(["nginx", "-t"])
        atomic_file(DROPIN, new_dropin)
        switch_release(CURRENT, release)
        run(["systemctl", "daemon-reload"])
        # Load callback log suppression/body limits before enabling OAuth routes.
        run(["systemctl", "reload", "nginx"])
        run(["systemctl", "restart", "undery-web"])
        data = health(3000, commit)
        https_data = json.loads(run(["curl", "--fail", "--silent", "--show-error", "--max-time", "15", "--resolve", "undery.link:443:127.0.0.1", "https://undery.link/api/health"]))
        if https_data.get("commit") != commit or https_data.get("status") != "ok" or https_data.get("checks", {}).get("database") != "ok":
            raise DeployError("HTTPS Nginx 경유 상태 확인이 실패했습니다.")
        if manifest.get("media") and (data.get("checks", {}).get("media") != "ok" or https_data.get("checks", {}).get("media") != "ok"):
            raise DeployError("운영 사진 저장소 접근 검사가 실패했습니다.")
        print("배포 완료: " + json.dumps(data, ensure_ascii=False), flush=True)
        print("관리자 접속: https://undery.link/admin", flush=True)
        print("브라우저 확인: 사용자 아이콘 · 본문 드래그 이미지 · VRChat 사진 추가/수정" if manifest.get("media") else "아직 확인할 항목: 실제 GitHub 로그인과 브라우저 글 작성/발행", flush=True)
        print(f"수동 복구: python3 {Path(__file__).resolve()} --rollback {backup}", flush=True)
    except BaseException:
        if changed_web:
            try:
                rollback(backup)
            except Exception:
                print(f"자동 복구를 완료하지 못했습니다. 복구 정보: {backup}/state.json", file=sys.stderr)
        else:
            print("웹 서비스 전환 전 중단했습니다. DB 백업과 준비 파일은 보존합니다.", file=sys.stderr)
        raise
    finally:
        if candidate is not None and candidate.poll() is None:
            candidate.terminate()
            try:
                candidate.wait(timeout=15)
            except subprocess.TimeoutExpired:
                candidate.kill()
                candidate.wait()
        LOG.close()
        LOG = None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=ROOT / "deploy/admin-source.json", help="검토한 배포 소스/현재 release manifest")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--apply", action="store_true", help="검사 후 실제 운영 migration과 release 전환")
    group.add_argument("--rollback", type=Path, help="출력된 백업 경로의 웹 release/설정만 복구")
    arguments = parser.parse_args()
    if os.geteuid() != 0:
        raise DeployError("서버 root 터미널에서 실행해야 합니다.")
    os.umask(0o077)
    descriptor = os.open("/run/undery-admin-deploy.lock", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, "a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise DeployError("다른 배포 작업이 실행 중입니다.") from None
        if arguments.rollback:
            rollback(arguments.rollback)
            return
        manifest = json.loads(arguments.manifest.read_text())
        container = preflight(manifest)
        print("사전 확인 통과. 대상 앱 커밋: " + manifest["commit"], flush=True)
        if arguments.apply:
            apply(manifest, container)


if __name__ == "__main__":
    try:
        main()
    except DeployError as failure:
        print("중단: " + str(failure), file=sys.stderr)
        sys.exit(1)
    except (OSError, ValueError, subprocess.SubprocessError):
        print("중단: 파일/프로세스/응답 처리 오류. 비밀값 보호를 위해 상세 내용은 비공개 배포 로그에서 확인합니다.", file=sys.stderr)
        sys.exit(1)
