#!/usr/bin/env python3
"""One-time PostgreSQL preparation for the existing host systemd deployment.

Run as root from a trusted checkout. Never starts/restarts the web service.
Existing database resources or credentials cause a stop; no reset or deletion.
"""

import argparse
import datetime
import os
from pathlib import Path
import re
import secrets
import socket
import stat
import subprocess
import sys
import tempfile
import time


class SetupError(Exception):
    pass


def command(arguments, *, environment=None, input_text=None, timeout=30):
    try:
        result = subprocess.run(
            arguments,
            env=environment,
            input=input_text,
            text=True,
            capture_output=True,
            timeout=timeout,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        raise SetupError(f"실행하지 못했습니다: {arguments[0]}") from None
    if result.returncode:
        # Do not dump subprocess output: SQL/env diagnostics can include secrets.
        raise SetupError(
            f"명령 실패: {' '.join(arguments[:3])} (exit {result.returncode}). "
            "생성된 파일·볼륨을 삭제하거나 초기화하지 말고 상태를 확인하십시오."
        )
    return result.stdout.strip()


def exclusive_private_file(path, contents):
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        handle.write(contents)


ASSIGNMENT = re.compile(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$")


def setting_values(source, name):
    return [
        match.group(2).strip().strip("\"'")
        for line in source.splitlines()
        if (match := ASSIGNMENT.match(line)) and match.group(1) == name
    ]


def database_env_value(source):
    values = setting_values(source, "DATABASE_URL")
    if len(values) != 1 or values[0]:
        raise SetupError("app.env에는 비어 있는 DATABASE_URL= 항목이 정확히 하나 있어야 합니다.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="사전 확인만 수행합니다. 변경하지 않습니다.")
    arguments = parser.parse_args()
    if os.geteuid() != 0:
        raise SetupError("서버의 root 터미널에서 실행해야 합니다.")
    os.umask(0o077)
    root = Path(__file__).resolve().parents[1]
    configuration = Path("/etc/undery")
    app_file = configuration / "app.env"
    bootstrap_file = configuration / "database-password"
    app_password_file = configuration / "database-app-password"
    test_file = configuration / "test.env"
    for path in [configuration, app_file]:
        if path.is_symlink():
            raise SetupError("설정 디렉터리/파일의 심볼릭 링크는 허용하지 않습니다.")
    if not app_file.is_file():
        raise SetupError("먼저 /etc/undery/app.env에 OAuth 설정을 저장하십시오.")
    info = app_file.stat()
    if info.st_uid != 0 or stat.S_IMODE(info.st_mode) != 0o600:
        raise SetupError("app.env는 root 소유이며 권한 0600이어야 합니다.")
    source = app_file.read_text(encoding="utf-8")
    database_env_value(source)
    for name in ["SITE_URL", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "ADMIN_GITHUB_ID"]:
        values = setting_values(source, name)
        if len(values) != 1 or not values[0]:
            raise SetupError(f"app.env의 {name} 설정을 확인하십시오.")
    if any(path.exists() or path.is_symlink() for path in [bootstrap_file, app_password_file, test_file]):
        raise SetupError("기존 DB 자격증명/시험 설정이 있습니다. 덮어쓰지 않고 중단합니다.")
    command(["docker", "info", "--format", "{{.ServerVersion}}"])
    command(["docker", "compose", "version", "--short"])
    volumes = command(["docker", "volume", "ls", "--format", "{{.Name}}"])
    if "undery-site_postgres_data" in volumes.splitlines():
        raise SetupError("기존 undery-site_postgres_data 볼륨이 있습니다. 데이터를 먼저 확인해야 합니다.")
    containers = command(["docker", "ps", "-a", "--filter", "label=com.docker.compose.project=undery-site", "--filter", "label=com.docker.compose.service=db", "--format", "{{.Names}}"])
    if containers:
        raise SetupError("기존 undery-site DB 컨테이너가 있습니다. 덮어쓰지 않고 중단합니다.")
    try:
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 5432))
    except OSError:
        raise SetupError("127.0.0.1:5432를 사용할 수 없습니다.") from None
    compose = ["docker", "compose", "--project-directory", str(root), "-p", "undery-site", "-f", str(root / "compose.yaml"), "-f", str(root / "deploy/compose.database-host.yaml"), "--profile", "database"]
    environment = {
        **os.environ,
        "APP_IMAGE": "undery-site:unused",
        "APP_ENV_FILE": str(app_file),
        "DATABASE_PASSWORD_FILE": str(bootstrap_file),
    }
    command([*compose, "config", "--quiet"], environment=environment)
    print("사전 확인 통과: 새 DB 구성 가능. 기존 웹 서비스는 변경하지 않습니다.", flush=True)
    if arguments.check:
        return

    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    backup = configuration / f"app.env.before-database-{timestamp}"
    exclusive_private_file(backup, source)
    bootstrap_password = secrets.token_hex(32)
    application_password = secrets.token_hex(32)
    exclusive_private_file(bootstrap_file, bootstrap_password + "\n")
    exclusive_private_file(app_password_file, application_password + "\n")
    print("PostgreSQL 이미지를 준비하고 DB 컨테이너만 시작합니다.", flush=True)
    command([*compose, "up", "-d", "db"], environment=environment, timeout=600)
    container = command([*compose, "ps", "-q", "db"], environment=environment)
    for _ in range(60):
        health = command(["docker", "inspect", "--format", "{{.State.Health.Status}}", container])
        if health == "healthy":
            break
        time.sleep(1)
    else:
        raise SetupError("DB가 준비되지 않았습니다. 기존 자료를 지우지 말고 상태를 확인하십시오.")
    # Only fixed identifiers and generated hex characters enter this SQL.
    # The password travels through stdin, never a command argument or stdout.
    sql = (
        f"CREATE ROLE undery LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '{application_password}';\n"
        "CREATE DATABASE undery OWNER undery;\n"
        "CREATE DATABASE undery_test OWNER undery;\n"
    )
    command([*compose, "exec", "-T", "db", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], environment=environment, input_text=sql)
    base_url = f"postgresql://undery:{application_password}@127.0.0.1:5432/"
    updated = "\n".join(
        f"DATABASE_URL={base_url}undery" if (match := ASSIGNMENT.match(line)) and match.group(1) == "DATABASE_URL" else line
        for line in source.splitlines()
    ) + "\n"
    # Do not overwrite OAuth changes made while the image was being downloaded.
    if app_file.read_text(encoding="utf-8") != source:
        raise SetupError("작업 중 app.env가 수정되었습니다. DB는 준비됐지만 환경 파일 갱신은 중단했습니다.")
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=configuration, prefix="app.env.", delete=False) as handle:
        temporary = Path(handle.name)
        handle.write(updated)
    temporary.replace(app_file)
    exclusive_private_file(test_file, f"DATABASE_URL={base_url}undery_test\nADMIN_TEST_DATABASE_URL={base_url}undery_test\n")
    print("완료: PostgreSQL healthy / 127.0.0.1:5432")
    print("완료: undery 운영 DB + undery_test 시험 DB / 앱 계정은 superuser 아님")
    print("완료: app.env 연결 정보 갱신 / OAuth 값 유지 / 원본 파일 비공개 백업")
    print("완료: /etc/undery/test.env 생성")
    print("다음 단계: 시험 DB migration과 통합 검사. 웹 재시작·운영 migration은 아직 수행하지 않았습니다.")


if __name__ == "__main__":
    try:
        main()
    except SetupError as failure:
        print(f"중단: {failure}", file=sys.stderr)
        sys.exit(1)
    except (OSError, UnicodeError):
        print("중단: 파일 접근/실행 오류. 비밀값 보호를 위해 상세 내용은 출력하지 않습니다.", file=sys.stderr)
        sys.exit(1)
