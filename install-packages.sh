#!/usr/bin/env bash
# 개인 웹사이트 계획서용 패키지 설치기 | 2026-09-09
# 대상: Ubuntu Desktop/Server 24.04 LTS, amd64 (Intel N97), systemd
# 실행: sudo bash ./install-ubuntu24-packages.sh
# 점검: bash ./install-ubuntu24-packages.sh --check
#
# 설치 범위
#   Docker Engine/Compose/Buildx + rootless 사전 패키지, Jenkins LTS/Java 21,
#   Node.js 24 LTS/npm, Nginx/Certbot(Cloudflare DNS 플러그인), AWS CLI v2,
#   PostgreSQL 클라이언트, Git/SSH/빌드/백업/미디어 검사 도구.
#   PostgreSQL 서버와 앱은 추후 Docker Compose로 구성한다.
#
# 변경 범위
#   Ubuntu universe와 Docker/Jenkins 공식 APT 저장소를 사용한다.
#   AWS CLI v2는 AWS 공식 ZIP과 PGP 서명을 검증해 설치한다 (APT 패키지에 의존하지 않음).
#   Jenkins 미러 다운로드 실패 시 공식 보관 서버를 사용하고 APT의 SHA256으로 검증한다.
#   Jenkins는 127.0.0.1:8080, controller 실행 슬롯 0, agent TCP 포트 비활성.
#   Jenkins 최초 설정 마법사는 유지한다. Docker 그룹 권한은 추가하지 않는다.
#   Nginx/SSH/Docker/Jenkins 서비스를 활성화한다. Nginx 기본 페이지가 뜰 수 있다.
#   UFW 규칙, SSH 인증, 공유기, 절전 설정, 기존 앱/DB는 변경하지 않는다.
#   도메인/인증서 발급/AWS 리소스/비밀키/CI agent/파이프라인은 구성하지 않는다.
#   rootless Docker는 사전 패키지만 설치한다. 계정과 daemon 설정은 별도다.
#
# 재실행
#   이미 설치된 APT 패키지는 건너뛰며 전체 업그레이드/제거/재부팅하지 않는다.
#   일부 실패 시 원인을 해결하고 다시 실행한다. 패키지를 자동 되돌리지 않는다.
#   다른 APT 작업의 잠금은 최대 10분 기다린다. 잠금 파일 삭제/프로세스 종료는 하지 않는다.
#   기존 수동 설치와 충돌하면 덮어쓰거나 삭제하지 않고 중단한다.
#   첫 설치 시 저장소의 버전을 사용하고 실제 버전을 아래 경로에 기록한다.
#   /var/lib/personal-site-bootstrap/installed-versions.txt
#   이후 보안 업데이트는 별도 운영 절차로 관리한다. 이 파일은 업데이트 도구가 아니다.
#
# 설치 방식 확인에 사용한 공식 문서 (2026-09-09):
# https://docs.docker.com/engine/install/ubuntu/
# https://docs.docker.com/engine/security/rootless/
# https://www.jenkins.io/doc/book/installing/linux/
# https://www.jenkins.io/doc/book/system-administration/systemd-services/
# https://www.jenkins.io/download/mirrors/
# https://nodejs.org/en/about/previous-releases
# https://packages.ubuntu.com/noble/python3-certbot-dns-cloudflare
# https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

set -Eeuo pipefail
IFS=$'\n\t'

STATE_DIR=/var/lib/personal-site-bootstrap
NODE_ROOT=/opt/personal-site
DOCKER_SOURCE=/etc/apt/sources.list.d/personal-site-docker.sources
JENKINS_SOURCE=/etc/apt/sources.list.d/personal-site-jenkins.list
JENKINS_OVERRIDE=/etc/systemd/system/jenkins.service.d/90-personal-site.conf
JENKINS_INIT=/var/lib/jenkins/init.groovy.d/90-personal-site.groovy
WORK_DIR=''
STAGE='시작'

BASE_PACKAGES=(
  ca-certificates curl gnupg git unzip xz-utils jq groff less
  build-essential pkg-config python3 python3-venv
  software-properties-common openssh-server ufw
  dnsutils iproute2 rsync logrotate
)
APP_PACKAGES=(
  fontconfig openjdk-21-jdk-headless nginx
  certbot python3-certbot-nginx python3-certbot-dns-cloudflare
  postgresql-client ffmpeg
  uidmap dbus-user-session slirp4netns fuse-overlayfs
)
DOCKER_PACKAGES=(
  docker-ce docker-ce-cli containerd.io docker-buildx-plugin
  docker-compose-plugin docker-ce-rootless-extras
)

log() { printf '\n[설치] %s\n' "$*"; }
warn() { printf '[안내] %s\n' "$*" >&2; }
die() { printf '[중단] %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'HELP'
Ubuntu 24.04 개인 웹사이트 패키지 설치

  bash ./install-ubuntu24-packages.sh --check   환경·충돌·패키지 현황 확인 (변경 없음)
  sudo bash ./install-ubuntu24-packages.sh     설치 및 기본 서비스 시작
  bash ./install-ubuntu24-packages.sh --help   도움말

인터넷 연결과 sudo 권한이 필요합니다. Ubuntu 24.04 amd64 전용입니다.
Windows에서는 실행하지 말고 파일을 Ubuntu로 복사한 뒤 실행하세요.
Jenkins는 SSH 터널 또는 Ubuntu 안의 브라우저로 접속합니다.
실제 사이트, CI/CD 작업, AWS 연결, 도메인 및 HTTPS 설정은 후속 작업입니다.
HELP
}

installed() {
  [[ $(dpkg-query -W -f='${Status}' "$1" 2>/dev/null) == 'install ok installed' ]]
}

cleanup() {
  # mktemp로 직접 만든 경로만 정리한다. 설치된 패키지와 사용자 파일은 삭제하지 않는다.
  if [[ -n $WORK_DIR && $WORK_DIR == /tmp/personal-site-bootstrap.* && -d $WORK_DIR ]]; then
    rm -rf -- "$WORK_DIR"
  fi
}

on_error() {
  local code=$?
  printf '\n[실패] 단계: %s / 줄: %s / 종료 코드: %s\n' "$STAGE" "$1" "$code" >&2
  printf '일부 패키지는 설치되었을 수 있습니다. 위 오류를 해결한 뒤 다시 실행하세요.\n' >&2
  exit "$code"
}

check_platform() {
  [[ -r /etc/os-release ]] || die 'Ubuntu에서 실행해야 합니다. /etc/os-release가 없습니다.'
  local ID='' VERSION_ID=''
  # shellcheck disable=SC1091
  . /etc/os-release
  [[ $ID == ubuntu && $VERSION_ID == 24.04 ]] || die 'Ubuntu 24.04 LTS 전용 스크립트입니다.'
  [[ $(dpkg --print-architecture) == amd64 ]] || die 'Intel N97에 맞춘 amd64 전용 스크립트입니다.'
  [[ -d /run/systemd/system && $(cat /proc/1/comm) == systemd ]] || die 'systemd로 부팅한 Ubuntu에서 실행하세요.'
  [[ -z $(dpkg --audit) ]] || die '완료되지 않은 패키지 작업이 있습니다. dpkg --audit 결과를 먼저 확인하세요.'
  local free_kib memory_kib
  free_kib=$(df -Pk /var | awk 'NR==2 {print $4}')
  memory_kib=$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)
  (( free_kib >= 8 * 1024 * 1024 )) || die '/var가 있는 파일시스템에 최소 8GB의 설치 여유 공간이 필요합니다.'
  (( free_kib >= 40 * 1024 * 1024 )) || warn '빌드·이미지·백업을 위해 설치 후 저장 공간을 추가 점검하세요. 현재 여유 공간이 40GB 미만입니다.'
  (( memory_kib >= 7 * 1024 * 1024 )) || warn '사용 가능한 물리 메모리가 계획의 8GB보다 적습니다. 빌드 전 메모리를 실측하세요.'
}

check_conflicts() {
  local package file tool
  for package in docker.io docker-compose docker-compose-v2 docker-doc docker-buildx podman-docker containerd runc; do
    if installed "$package"; then
      die "충돌 가능 패키지: $package. 컨테이너·데이터를 확인한 뒤 공식 Docker로 이전하세요. 자동 제거하지 않습니다."
    fi
  done
  if { installed jenkins || [[ -e /var/lib/jenkins/config.xml ]]; } && [[ ! -f $STATE_DIR/managed ]]; then
    die '기존 Jenkins가 있습니다. 기존 설정을 보호하기 위해 자동 설치를 중단합니다.'
  fi
  if command -v snap >/dev/null 2>&1 && snap list certbot >/dev/null 2>&1; then
    die 'Snap Certbot이 이미 있습니다. APT Certbot과 중복되지 않도록 기존 설치 방식을 먼저 정리하세요.'
  fi
  for tool in certbot; do
    if command -v "$tool" >/dev/null 2>&1 && [[ $(command -v "$tool") != /usr/bin/"$tool" ]]; then
      die "별도 설치된 $tool 경로가 있습니다: $(command -v "$tool"). 기존 설치를 자동 교체하지 않습니다."
    fi
  done
  if command -v aws >/dev/null 2>&1; then
    [[ $(aws --version 2>&1) == aws-cli/2.* ]] || die '기존 AWS CLI가 v2가 아닙니다. 기존 설치를 먼저 확인하세요.'
  else
    for tool in aws aws_completer; do
      [[ ! -e /usr/local/bin/$tool && ! -L /usr/local/bin/$tool ]] || die "/usr/local/bin/$tool 경로가 이미 있습니다. 자동 덮어쓰지 않습니다."
    done
    [[ ! -e $NODE_ROOT/aws-cli ]] || die '기존 AWS CLI 설치 디렉터리를 확인하세요. 자동 덮어쓰지 않습니다.'
  fi
  if command -v node >/dev/null 2>&1; then
    [[ $(node --version) == v24.* ]] || die '기존 Node.js가 24 LTS가 아닙니다. 경로와 프로젝트 호환성을 먼저 확인하세요.'
    command -v npm >/dev/null 2>&1 || die 'Node.js는 있으나 npm이 없습니다. 기존 Node 설치를 먼저 확인하세요.'
  else
    for tool in node npm npx; do
      [[ ! -e /usr/local/bin/$tool && ! -L /usr/local/bin/$tool ]] || die "/usr/local/bin/$tool 경로가 이미 있습니다. 자동 덮어쓰지 않습니다."
    done
  fi
  # 다른 도구가 만든 저장소와 signed-by 설정을 중복 등록하지 않는다.
  shopt -s nullglob
  for file in /etc/apt/sources.list /etc/apt/sources.list.d/*.list /etc/apt/sources.list.d/*.sources; do
    [[ -f $file ]] || continue
    if [[ $file != "$DOCKER_SOURCE" ]] && grep -Eq '^[^#]*download\.docker\.com' "$file"; then
      die "기존 Docker 저장소를 확인하세요: $file. 이 설치기는 기존 저장소를 자동 변경하지 않습니다."
    fi
    if [[ $file != "$JENKINS_SOURCE" ]] && grep -Eq '^[^#]*pkg\.jenkins\.io' "$file"; then
      die "기존 Jenkins 저장소를 확인하세요: $file. 이 설치기는 기존 저장소를 자동 변경하지 않습니다."
    fi
  done
  shopt -u nullglob
  if id jenkins >/dev/null 2>&1 && id -nG jenkins | tr ' ' '\n' | grep -qx docker; then
    die 'jenkins 계정에 운영 Docker 그룹 권한이 있습니다. 계획의 권한 분리부터 확인하세요.'
  fi
}

check_service_ports() {
  local port listeners listener jenkins_pid
  for port in 80 8080; do
    listeners=$(ss -H -ltnp "sport = :$port")
    [[ -n $listeners ]] || continue
    if (( EUID != 0 )); then
      warn "${port} 포트가 사용 중입니다. sudo bash ./install-ubuntu24-packages.sh --check 로 소유 서비스를 확인하세요."
      continue
    fi
    jenkins_pid=$(systemctl show jenkins -p MainPID --value 2>/dev/null || true)
    while IFS= read -r listener; do
      if [[ $port == 80 && $listener == *'"nginx"'* ]]; then continue; fi
      if [[ $port == 8080 && -f $STATE_DIR/managed && ${jenkins_pid:-0} != 0 && $listener == *"pid=$jenkins_pid,"* ]]; then continue; fi
      warn "$listener"
      die "${port} 포트를 다른 서비스가 사용 중입니다. 기존 서비스를 확인한 후 실행하세요. 자동 중지·제거하지 않습니다."
    done <<< "$listeners"
  done
}

apt_run() {
  # DPkg::Lock::Timeout만으로는 apt-get update의 lists/lock을 기다리지 않는다.
  # 실제 APT 오류 중 잠금 충돌만 재시도한다. 저장소/서명/네트워크 오류는 즉시 반환한다.
  local wait_limit=${APT_LOCK_WAIT_SECONDS:-600} deadline attempt_log status remaining pause_seconds
  local -a result
  [[ $wait_limit =~ ^[0-9]+$ && ${#wait_limit} -le 4 ]] || die 'APT_LOCK_WAIT_SECONDS는 0~3600 사이의 정수여야 합니다.'
  wait_limit=$((10#$wait_limit))
  (( wait_limit <= 3600 )) || die 'APT 잠금 대기 시간은 최대 3600초까지 설정할 수 있습니다.'
  deadline=$((SECONDS + wait_limit))
  attempt_log=$(mktemp "$WORK_DIR/apt.XXXXXX")
  APT_LAST_LOG=$attempt_log
  while :; do
    if LC_ALL=C DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=l apt-get \
      -o DPkg::Lock::Timeout=30 -o Acquire::Retries=3 \
      -o Acquire::http::Timeout=30 -o Acquire::https::Timeout=30 \
      -o APT::Update::Error-Mode=any "$@" 2>&1 | tee "$attempt_log"; then
      return 0
    else
      result=("${PIPESTATUS[@]}")
    fi
    (( result[1] == 0 )) || die 'APT 실행 기록을 저장하지 못했습니다. 저장 공간과 파일 권한을 확인하세요.'
    status=${result[0]}
    if ! grep -Eq 'Could not get lock |Unable to acquire the dpkg frontend lock|Unable to lock directory ' "$attempt_log"; then
      return "$status"
    fi
    remaining=$((deadline - SECONDS))
    if (( remaining <= 0 )); then
      warn '다른 패키지 작업의 잠금이 계속 유지됩니다. 해당 작업이 끝난 후 다시 실행하세요. 잠금 파일은 삭제하지 마세요.'
      return "$status"
    fi
    pause_seconds=10
    (( remaining >= pause_seconds )) || pause_seconds=$remaining
    warn "다른 APT 작업이 실행 중입니다. ${pause_seconds}초 후 재시도합니다 (남은 대기 약 ${remaining}초)."
    sleep "$pause_seconds"
  done
}

install_missing() {
  local package
  local missing=()
  for package in "$@"; do
    if ! installed "$package"; then missing+=("$package"); fi
  done
  if (( ${#missing[@]} )); then
    apt_run install -y --no-remove --no-install-recommends "${missing[@]}"
  fi
}

managed_file() {
  # stdin을 기록. 내용이 다른 기존 파일과 심볼릭 링크는 보호한다.
  local target=$1 mode=${2:-0644} pending parent
  pending=$(mktemp "$WORK_DIR/config.XXXXXX")
  cat > "$pending"
  [[ ! -L $target ]] || die "설정 경로가 심볼릭 링크입니다: $target"
  if [[ -e $target ]]; then
    cmp -s "$pending" "$target" || die "기존 설정 내용이 다릅니다: $target. 비교 후 직접 정리하세요."
  else
    parent=$(dirname "$target")
    if [[ ! -d $parent ]]; then install -d -m 0755 "$parent"; fi
    install -m "$mode" "$pending" "$target"
  fi
}

download() {
  curl --fail --show-error --silent --location --proto '=https' --proto-redir '=https' \
    --connect-timeout 20 --max-time 600 --retry 3 --output "$2" "$1"
}

add_repositories() {
  STAGE='공식 APT 저장소 등록'
  install -d -m 0755 /etc/apt/keyrings
  install -d -m 0700 "$WORK_DIR/gnupg"
  # 키는 HTTPS 공식 배포처에서 수신하고 개별 저장소의 signed-by로 범위를 제한한다.
  if [[ ! -f /etc/apt/keyrings/personal-site-docker.asc ]]; then
    download https://download.docker.com/linux/ubuntu/gpg "$WORK_DIR/docker.asc"
    gpg --homedir "$WORK_DIR/gnupg" --batch --show-keys "$WORK_DIR/docker.asc" >/dev/null
    install -m 0644 "$WORK_DIR/docker.asc" /etc/apt/keyrings/personal-site-docker.asc
  fi
  if [[ ! -f /etc/apt/keyrings/personal-site-jenkins.asc ]]; then
    download https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key "$WORK_DIR/jenkins.asc"
    gpg --homedir "$WORK_DIR/gnupg" --batch --show-keys "$WORK_DIR/jenkins.asc" >/dev/null
    install -m 0644 "$WORK_DIR/jenkins.asc" /etc/apt/keyrings/personal-site-jenkins.asc
  fi
  managed_file "$DOCKER_SOURCE" <<'DOCKER'
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: amd64
Signed-By: /etc/apt/keyrings/personal-site-docker.asc
DOCKER
  managed_file "$JENKINS_SOURCE" <<'JENKINS'
deb [signed-by=/etc/apt/keyrings/personal-site-jenkins.asc] https://pkg.jenkins.io/debian-stable binary/
JENKINS
  apt_run update
}

install_node() {
  STAGE='Node.js 24 LTS 설치'
  if command -v node >/dev/null 2>&1; then
    log "기존 Node.js $(node --version) 사용"
    return
  fi
  local archive version digest destination tool
  download https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt "$WORK_DIR/SHASUMS256.txt"
  archive=$(awk '$2 ~ /^node-v24\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$/ {print $2}' "$WORK_DIR/SHASUMS256.txt")
  [[ $archive =~ ^node-v24\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$ ]] || die 'Node 공식 체크섬 목록에서 24 LTS 파일 하나를 확인하지 못했습니다.'
  version=${archive#node-}
  version=${version%-linux-x64.tar.xz}
  digest=$(awk -v name="$archive" '$2 == name {print $1}' "$WORK_DIR/SHASUMS256.txt")
  [[ $digest =~ ^[a-fA-F0-9]{64}$ ]] || die 'Node SHA256 형식이 올바르지 않습니다.'
  download "https://nodejs.org/dist/$version/$archive" "$WORK_DIR/$archive"
  printf '%s  %s\n' "$digest" "$WORK_DIR/$archive" | sha256sum --check --status || die 'Node 다운로드 체크섬이 일치하지 않습니다.'
  destination="$NODE_ROOT/${archive%.tar.xz}"
  install -d -m 0755 "$NODE_ROOT" /usr/local/bin
  [[ ! -L $NODE_ROOT/node ]] || [[ $(readlink "$NODE_ROOT/node") == "$destination" ]] || die '기존 관리용 Node 링크가 다른 버전을 가리킵니다.'
  [[ ! -e $NODE_ROOT/node || -L $NODE_ROOT/node ]] || die '관리용 Node 경로가 이미 디렉터리 또는 파일로 존재합니다.'
  if [[ -e $destination ]]; then
    [[ -f $destination/.bootstrap-sha256 && $(cat "$destination/.bootstrap-sha256") == "$digest" ]] || die '기존 Node 설치 경로를 확인하세요. 자동 교체하지 않습니다.'
  else
    tar -xJf "$WORK_DIR/$archive" -C "$WORK_DIR" --no-same-owner
    printf '%s\n' "$digest" > "$WORK_DIR/${archive%.tar.xz}/.bootstrap-sha256"
    mv -- "$WORK_DIR/${archive%.tar.xz}" "$destination"
  fi
  ln -sfn "$destination" "$NODE_ROOT/node"
  for tool in node npm npx; do
    ln -s "$NODE_ROOT/node/bin/$tool" "/usr/local/bin/$tool"
  done
  hash -r
}

install_aws_cli() {
  STAGE='AWS CLI v2 공식 배포본 설치'
  if command -v aws >/dev/null 2>&1; then
    log "기존 AWS CLI 사용: $(aws --version 2>&1)"
    return
  fi
  log "$STAGE"
  local fingerprint
  install -d -m 0700 "$WORK_DIR/aws-gnupg"
  # AWS 공식 문서의 공개 서명키. 비밀키가 아니며 만료일은 2027-07-01이다.
  # 키가 갱신되면 공식 문서의 지문을 다시 확인한다. 검증 실패를 우회하지 않는다.
  cat > "$WORK_DIR/aws-public-key.asc" <<'AWS_KEY'
-----BEGIN PGP PUBLIC KEY BLOCK-----

mQINBF2Cr7UBEADJZHcgusOJl7ENSyumXh85z0TRV0xJorM2B/JL0kHOyigQluUG
ZMLhENaG0bYatdrKP+3H91lvK050pXwnO/R7fB/FSTouki4ciIx5OuLlnJZIxSzx
PqGl0mkxImLNbGWoi6Lto0LYxqHN2iQtzlwTVmq9733zd3XfcXrZ3+LblHAgEt5G
TfNxEKJ8soPLyWmwDH6HWCnjZ/aIQRBTIQ05uVeEoYxSh6wOai7ss/KveoSNBbYz
gbdzoqI2Y8cgH2nbfgp3DSasaLZEdCSsIsK1u05CinE7k2qZ7KgKAUIcT/cR/grk
C6VwsnDU0OUCideXcQ8WeHutqvgZH1JgKDbznoIzeQHJD238GEu+eKhRHcz8/jeG
94zkcgJOz3KbZGYMiTh277Fvj9zzvZsbMBCedV1BTg3TqgvdX4bdkhf5cH+7NtWO
lrFj6UwAsGukBTAOxC0l/dnSmZhJ7Z1KmEWilro/gOrjtOxqRQutlIqG22TaqoPG
fYVN+en3Zwbt97kcgZDwqbuykNt64oZWc4XKCa3mprEGC3IbJTBFqglXmZ7l9ywG
EEUJYOlb2XrSuPWml39beWdKM8kzr1OjnlOm6+lpTRCBfo0wa9F8YZRhHPAkwKkX
XDeOGpWRj4ohOx0d2GWkyV5xyN14p2tQOCdOODmz80yUTgRpPVQUtOEhXQARAQAB
tCFBV1MgQ0xJIFRlYW0gPGF3cy1jbGlAYW1hem9uLmNvbT6JAlQEEwEIAD4CGwMF
CwkIBwIGFQoJCAsCBBYCAwECHgECF4AWIQT7Xbd/1cEYuAURraimMQrMRnJHXAUC
akV0ygUJDqP4lQAKCRCmMQrMRnJHXFHjD/9eyZLYcKuQOlLvtqSDtUBiEZf6ZZjM
i3ygYH8rJNtuToUH+HvSpe819urJCquXhDrlK6N+aqW0hCLtNABJG/vsafIgvIYJ
hSGgpgtNnQyMV1jViRWqPjbouw8OkYKBThUfT1i2Y+wn58ifs6ODBCmTexWtXspA
Si+Gt49xDOW0APmbOPnI+a4HJW6tVEo6MWS0WjzpiBayR3d1A4pt4YrPfSdDgpLo
h2SLQqlRqvvVZJaWBjhkErNFpfsBA06sDcPEOb0G8LBUbR4WOcdvhe5LubJbZuxC
AG9kNPCVeQP1ixwjgjXKysaxeQ6rv0VzIQgRp6tLVLWhy6AKDNvLjFSsmXZ1Wl08
Y/RlOHXlzLuQMRE6sR1wOdRxc9TsrNWTGiBK65cvSWOy03JeBkQQ8pesqltiyxI9
U21kkgiXtTSKNGfKK8pO27D81YANhRqPK7iTp6kuFiY2WtOg90KTMNlIT+Ff85Y2
b1rHj6Z0SrCkJujhWk3IBPic/wJgz01LEc/OAdUPlby90RJZcIBhSlWhT7mXnXIO
c0HWlNQrns2s3CTyYwZSiSlYe9ApeLwhjDo8NhbFuCAy61l6O5UsR4AfZxx/rGKv
2wFb1/RN/P4gNe6vmxZAPjR0AQcwD3tc2McimOLr/22kmPz8IH3I0X7WoSFr0Biz
E91G7bb0hOb/cA==
=knv7
-----END PGP PUBLIC KEY BLOCK-----
AWS_KEY
  fingerprint=$(gpg --homedir "$WORK_DIR/aws-gnupg" --batch --with-colons --show-keys "$WORK_DIR/aws-public-key.asc" | awk -F: '$1=="fpr" {print $10; exit}')
  [[ $fingerprint == FB5DB77FD5C118B80511ADA8A6310ACC4672475C ]] || die 'AWS 공개키 지문이 일치하지 않습니다.'
  gpg --homedir "$WORK_DIR/aws-gnupg" --batch --import "$WORK_DIR/aws-public-key.asc"
  download https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip "$WORK_DIR/awscliv2.zip"
  download https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip.sig "$WORK_DIR/awscliv2.zip.sig"
  gpg --homedir "$WORK_DIR/aws-gnupg" --batch --verify "$WORK_DIR/awscliv2.zip.sig" "$WORK_DIR/awscliv2.zip" || die 'AWS 설치 파일의 서명을 검증하지 못했습니다.'
  unzip -q "$WORK_DIR/awscliv2.zip" -d "$WORK_DIR"
  "$WORK_DIR/aws/install" --install-dir "$NODE_ROOT/aws-cli" --bin-dir /usr/local/bin
  hash -r
  [[ $(aws --version 2>&1) == aws-cli/2.* ]] || die 'AWS CLI v2 실행을 확인하지 못했습니다.'
}

install_jenkins_package() {
  if installed jenkins; then return; fi
  local status version record filename digest package_file
  if install_missing jenkins; then
    return
  else
    status=$?
  fi
  # 다운로드 실패에만 대체 경로를 사용한다. 설정/의존성 오류를 우회하지 않는다.
  if ! grep -Eq 'Failed to fetch .*jenkins[^ ]*\.deb' "${APT_LAST_LOG:-/dev/null}"; then
    return "$status"
  fi
  log 'Jenkins 미러 다운로드 실패: 공식 보관 서버에서 동일한 패키지를 검증해 받습니다.'
  version=$(LC_ALL=C apt-cache policy jenkins | awk '/Candidate:/ {print $2}')
  [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die 'Jenkins LTS 설치 후보 버전을 확인하지 못했습니다.'
  record=$(LC_ALL=C apt-cache show "jenkins=$version")
  filename=$(printf '%s\n' "$record" | awk '/^Filename:/ {print $2; exit}')
  digest=$(printf '%s\n' "$record" | awk '/^SHA256:/ {print $2; exit}')
  [[ $filename == "binary/jenkins_${version}_all.deb" && $digest =~ ^[a-fA-F0-9]{64}$ ]] || die '서명된 APT 목록에서 Jenkins 파일명과 SHA256을 확인하지 못했습니다.'
  package_file=${filename#binary/}
  download "https://archives.jenkins.io/debian-stable/$package_file" "$WORK_DIR/$package_file"
  printf '%s  %s\n' "$digest" "$WORK_DIR/$package_file" | sha256sum --check --status || die 'Jenkins 보관 서버 파일의 SHA256이 APT 목록과 다릅니다.'
  # 검증된 파일을 APT 캐시에 놓고 정상 패키지 설치 절차로 진행한다.
  install -m 0644 "$WORK_DIR/$package_file" "/var/cache/apt/archives/$package_file"
  apt_run install -y --no-remove --no-install-recommends "jenkins=$version"
}

configure_jenkins() {
  STAGE='Jenkins 기본 설정'
  # 패키지 설치 중 자동 시작되는 순간부터 loopback에만 바인딩한다.
  managed_file "$JENKINS_OVERRIDE" <<'SERVICE'
[Service]
Environment="JENKINS_LISTEN_ADDRESS=127.0.0.1"
Environment="JENKINS_PORT=8080"
Environment="JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64"
Environment="JENKINS_JAVA_CMD=/usr/lib/jvm/java-21-openjdk-amd64/bin/java"
Environment="JAVA_OPTS=-Djava.awt.headless=true -Xms256m -Xmx768m"
SERVICE
  systemctl daemon-reload
  install_jenkins_package
  install -d -o jenkins -g jenkins -m 0700 /var/lib/jenkins/init.groovy.d
  managed_file "$JENKINS_INIT" 0600 <<'GROOVY'
// 설정 마법사와 인증을 유지하고 controller에서 빌드를 실행하지 않는다.
import jenkins.model.Jenkins
def controller = Jenkins.get()
controller.setNumExecutors(0)
controller.setSlaveAgentPort(-1)
controller.save()
GROOVY
  chown jenkins:jenkins "$JENKINS_INIT"
  # 설치 완료 후 재실행할 때 사용 중인 Jenkins를 불필요하게 재시작하지 않는다.
  if [[ ! -f $STATE_DIR/jenkins-configured ]]; then
    systemctl restart jenkins
    touch "$STATE_DIR/jenkins-configured"
  fi
  systemctl enable --now jenkins
}

verify_and_record() {
  STAGE='설치 결과 검증'
  local service ready=0 attempt
  nginx -t
  for service in docker nginx ssh jenkins; do
    systemctl is-active --quiet "$service" || die "$service 서비스가 실행되지 않았습니다. 해당 서비스 상태를 확인하세요."
  done
  [[ $(node --version) == v24.* ]] || die 'Node.js 24 실행을 확인하지 못했습니다.'
  [[ $(aws --version 2>&1) == aws-cli/2.* ]] || die 'AWS CLI v2 실행을 확인하지 못했습니다.'
  for attempt in {1..45}; do
    # 최초 설정 화면의 HTTP 응답만 검사하며 비밀번호/로그 내용은 출력하지 않는다.
    if curl --silent --noproxy 127.0.0.1 --output /dev/null --connect-timeout 2 --max-time 3 http://127.0.0.1:8080/login; then
      ready=1
      break
    fi
    sleep 2
  done
  (( ready == 1 )) || die 'Jenkins가 아직 HTTP 요청에 응답하지 않습니다. sudo systemctl status jenkins 로 확인하세요.'
  # Java의 IPv4-mapped IPv6 표기도 같은 IPv4 loopback 바인딩이다.
  if ss -H -ltn 'sport = :8080' | awk '{print $4}' | grep -Eqv '^(127\.0\.0\.1|\[::ffff:127\.0\.0\.1\]):8080$'; then
    die '8080 포트의 바인딩이 loopback 전용인지 확인해야 합니다.'
  fi
  # 구성 파일 검사는 서비스 시작 후 Groovy 설정이 실제 저장되었는지 확인한다.
  grep -q '<numExecutors>0</numExecutors>' /var/lib/jenkins/config.xml || die 'Jenkins controller 실행 슬롯이 0으로 설정되지 않았습니다.'
  grep -q '<slaveAgentPort>-1</slaveAgentPort>' /var/lib/jenkins/config.xml || die 'Jenkins agent TCP 수신 포트가 비활성화되지 않았습니다.'
  {
    printf 'Verified at: %s\n' "$(date -Is)"
    printf 'Platform: Ubuntu 24.04 amd64\n\n'
    dpkg-query -W -f='${binary:Package}\t${Version}\n' "${BASE_PACKAGES[@]}" "${APP_PACKAGES[@]}" "${DOCKER_PACKAGES[@]}" jenkins
    printf '\nRuntime checks:\n'
    node --version
    npm --version
    /usr/lib/jvm/java-21-openjdk-amd64/bin/java -version 2>&1
    docker --version
    docker compose version
    docker buildx version
    docker --host unix:///var/run/docker.sock info --format 'Docker server: {{.ServerVersion}}'
    certbot --version
    aws --version
    psql --version
    ffprobe -version | sed -n '1p'
  } > "$STATE_DIR/installed-versions.txt"
  chmod 0600 "$STATE_DIR/installed-versions.txt"
  cat "$STATE_DIR/installed-versions.txt"
  touch "$STATE_DIR/completed"
}

show_next_steps() {
  cat <<'NEXT'

패키지 설치 및 서비스 검증이 완료되었습니다.

Jenkins 접속:
  Ubuntu PC 브라우저: http://127.0.0.1:8080
  원격 PC: ssh -N -L 18080:127.0.0.1:8080 사용자명@서버주소
  터널 연결 후 원격 PC 브라우저: http://127.0.0.1:18080
  최초 설정 비밀번호 확인: sudo cat /var/lib/jenkins/secrets/initialAdminPassword
  (설정 마법사를 이미 끝냈다면 기존 관리자 계정으로 로그인합니다.)

다음 작업:
  1. Jenkins 관리자 설정 및 필요한 플러그인 설치.
     CI와 배포 계정/agent 분리, CI rootless Docker 구성, 동시 빌드 1개 설정.
     Jenkins/CI 계정에는 운영 Docker 소켓이나 docker 그룹 권한을 주지 않습니다.
     이 스크립트는 agent와 rootless daemon을 생성하지 않았습니다.
  2. GitHub main 약 2분 polling, 검사/빌드/GHCR/배포/복구 파이프라인 구성.
  3. Next.js 앱과 PostgreSQL을 Compose로 배치. DB·앱 직접 포트는 외부 비공개.
  4. 공인 IP/CGNAT 확인, 도메인/DNS only/DDNS/포트포워딩 설정.
     Cloudflare DNS API 자격증명을 준비한 뒤 인증서 발급·갱신/Nginx 연결.
  5. AWS S3/CloudFront, 최소권한 인증과 월 3만원 예산 알림 구성.
  6. SSH 키/방화벽/자동 절전 방지/재부팅 복구/백업 복원/빌드 자원 확인.

Node.js는 호스트 도구입니다. 추후 앱 Dockerfile에서도 Node 버전을 고정하세요.
ffmpeg/ffprobe는 미디어 검사·썸네일 도구이며 영상 자동 변환 작업은 만들지 않았습니다.
Docker 공개 포트는 UFW를 우회할 수 있으므로 Compose의 포트 바인딩도 확인하세요.
비밀키·비밀번호를 GitHub에 올리지 마세요. 설치 과정에서 AWS 자원은 만들지 않았습니다.
설치 버전 기록: /var/lib/personal-site-bootstrap/installed-versions.txt
NEXT
  if [[ -f /var/run/reboot-required ]]; then
    warn 'Ubuntu가 재부팅 필요 상태를 알립니다. 원격 재접속을 확인하고 적절한 때 직접 재부팅하세요.'
  fi
}

main() {
  local mode=install package
  case "${1:-}" in
    -h|--help) usage; return 0 ;;
    --check) mode=check ;;
    '') ;;
    *) usage >&2; return 2 ;;
  esac
  (( $# <= 1 )) || { usage >&2; return 2; }
  # sudo 호출 시에도 사용자 PATH의 스크립트를 root로 실행하지 않도록 제한한다.
  export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
  umask 022
  STAGE='설치 전 점검'
  check_platform
  check_conflicts
  check_service_ports
  if [[ $mode == check ]]; then
    log '환경·충돌 검사 통과. 아래 항목은 패키지 존재 여부이며 서비스 동작 검사는 아닙니다.'
    for package in "${BASE_PACKAGES[@]}" "${APP_PACKAGES[@]}" "${DOCKER_PACKAGES[@]}" jenkins; do
      if installed "$package"; then printf '설치됨  %s\n' "$package"; else printf '설치예정  %s\n' "$package"; fi
    done
    if command -v node >/dev/null 2>&1; then node --version; else printf '설치예정  Node.js 24 LTS (공식 바이너리)\n'; fi
    if command -v aws >/dev/null 2>&1; then aws --version; else printf '설치예정  AWS CLI v2 (AWS 공식 ZIP/서명 검증)\n'; fi
    return 0
  fi
  (( EUID == 0 )) || die 'sudo bash ./install-ubuntu24-packages.sh 로 실행하세요.'
  exec 9>/run/lock/personal-site-bootstrap.lock
  flock -n 9 || die '동일한 설치 스크립트가 이미 실행 중입니다.'
  trap 'on_error "$LINENO"' ERR
  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  WORK_DIR=$(mktemp -d /tmp/personal-site-bootstrap.XXXXXXXX)
  # 비밀값은 저장하지 않는다. 상태 표시는 일반 사용자 --check에서도 읽을 수 있다.
  install -d -m 0755 "$STATE_DIR"
  touch "$STATE_DIR/managed"
  STAGE='Ubuntu 기본 패키지 설치'
  log "$STAGE"
  apt_run update
  install_missing "${BASE_PACKAGES[@]}"
  add-apt-repository --yes --no-update universe
  apt_run update
  STAGE='웹 서비스·Java·보조 패키지 설치'
  log "$STAGE"
  install_missing "${APP_PACKAGES[@]}"
  add_repositories
  STAGE='Docker 패키지 설치'
  log "$STAGE"
  install_missing "${DOCKER_PACKAGES[@]}"
  install_node
  install_aws_cli
  configure_jenkins
  STAGE='기본 서비스 시작'
  systemctl enable --now docker nginx ssh
  verify_and_record
  show_next_steps
}

if [[ ${BASH_SOURCE[0]} == "$0" ]]; then
  main "$@"
fi
