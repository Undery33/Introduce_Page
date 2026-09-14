#!/usr/bin/env bash
# 대상: 새로 설치한 Ubuntu 24.04 LTS (amd64, systemd)
# 실행: bash install-packages.sh
# install-settings.txt 파일을 이 스크립트와 같은 폴더에 둡니다.
# 기존 패키지의 이전/충돌 해결과 서버 운영 설정은 별도 작업입니다.

# 명령이나 파이프라인이 실패하면 즉시 중단합니다.
set -euo pipefail

# 공개키와 다운로드 주소는 별도 TXT 설정 파일에서 읽습니다.
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/install-settings.txt"

echo "패키지 설치를 시작합니다."
sudo -v

# 다운로드 파일을 보관하고 종료 시 정리합니다.
INSTALL_TMP=$(mktemp -d)
trap 'rm -rf -- "$INSTALL_TMP"' EXIT

# 1. 기본 도구 설치 및 Ubuntu universe 저장소 활성화
echo "[1/6] 기본 도구 설치"
sudo apt-get update
sudo apt-get install -y \
  ca-certificates curl gnupg git unzip xz-utils jq groff less \
  build-essential pkg-config python3 python3-venv \
  software-properties-common openssh-server ufw \
  dnsutils iproute2 rsync logrotate
sudo add-apt-repository -y universe
sudo apt-get update

# 2. Java, 웹 서버, 인증서 및 보조 도구 설치
# PostgreSQL은 클라이언트만, rootless Docker는 준비 패키지만 설치합니다.
echo "[2/6] Java 및 웹 서버 도구 설치"
sudo apt-get install -y \
  fontconfig openjdk-21-jdk-headless nginx \
  certbot python3-certbot-nginx python3-certbot-dns-cloudflare \
  postgresql-client ffmpeg \
  uidmap dbus-user-session slirp4netns fuse-overlayfs

# 3. Docker 공식 저장소 등록 및 Engine/Compose/Buildx 설치
echo "[3/6] Docker 설치"
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL "$DOCKER_KEY_URL" \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: $DOCKER_REPO_URL
Suites: noble
Components: stable
Architectures: amd64
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt-get update
sudo apt-get install -y \
  docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin docker-ce-rootless-extras

# 4. Jenkins LTS 설치 (Java는 2단계에서 먼저 설치)
# Jenkins는 패키지 기본 설정을 사용하며 HTTP 포트는 8080입니다.
echo "[4/6] Jenkins LTS 설치"
sudo curl -fsSL "$JENKINS_KEY_URL" \
  -o /etc/apt/keyrings/jenkins-keyring.asc
sudo chmod a+r /etc/apt/keyrings/jenkins-keyring.asc
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] $JENKINS_REPO_URL binary/" \
  | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt-get update
sudo apt-get install -y jenkins

# 5. NodeSource 저장소를 이용한 Node.js 24 설치 (npm 포함)
echo "[5/6] Node.js 24 및 npm 설치"
curl -fsSL "$NODESOURCE_KEY_URL" -o "$INSTALL_TMP/nodesource.asc"
sudo gpg --batch --yes --dearmor \
  -o /etc/apt/keyrings/nodesource.gpg "$INSTALL_TMP/nodesource.asc"
sudo chmod a+r /etc/apt/keyrings/nodesource.gpg

sudo tee /etc/apt/sources.list.d/nodesource.sources > /dev/null <<EOF
Types: deb
URIs: $NODESOURCE_REPO_URL
Suites: nodistro
Components: main
Architectures: amd64
Signed-By: /etc/apt/keyrings/nodesource.gpg
EOF

sudo apt-get update
sudo apt-get install -y nodejs

# 6. AWS CLI v2 다운로드, 공개키 서명 검증 및 설치
echo "[6/6] AWS CLI v2 설치"
curl -fsSL "$AWS_CLI_ZIP_URL" -o "$INSTALL_TMP/awscliv2.zip"
curl -fsSL "$AWS_CLI_SIG_URL" -o "$INSTALL_TMP/awscliv2.zip.sig"
mkdir -m 0700 "$INSTALL_TMP/gnupg"
printf '%s\n' "$AWS_CLI_PUBLIC_KEY" \
  | gpg --batch --homedir "$INSTALL_TMP/gnupg" --import
gpg --batch --homedir "$INSTALL_TMP/gnupg" \
  --verify "$INSTALL_TMP/awscliv2.zip.sig" "$INSTALL_TMP/awscliv2.zip"
unzip -q "$INSTALL_TMP/awscliv2.zip" -d "$INSTALL_TMP"
sudo "$INSTALL_TMP/aws/install"

# 서비스 활성화 및 시작
sudo systemctl enable --now docker nginx ssh jenkins

echo "패키지 설치 명령이 모두 완료되었습니다."
echo "Docker 실행: sudo docker ps"
echo "Jenkins 접속: http://서버주소:8080 (서버 내부: http://127.0.0.1:8080)"
echo "Jenkins 초기 비밀번호 확인: sudo cat /var/lib/jenkins/secrets/initialAdminPassword"
