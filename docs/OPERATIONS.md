# 실행·운영 전환 안내

## 현재 운영과 개발 분리

현재 `https://undery.link`는 Nginx의 준비 화면을 제공한다. 이번 기반 앱은 로컬에서 별도로 검증한다. 저장소의 Docker/Compose/Nginx/Jenkins 파일은 운영 준비물이며 설치 완료를 뜻하지 않는다.

운영 전환 후 루트 주소는 계획대로 404가 된다. 접근 주소는 `/coding`, `/game`, `/whoami`다. 이는 장애가 아니라 의도된 경로 정책이다.

## 앱과 컨테이너

```sh
docker build --build-arg BUILD_COMMIT=$(git rev-parse HEAD) -t undery-site:foundation .
APP_IMAGE=undery-site:foundation docker compose up -d app
SMOKE_BASE_URL=http://127.0.0.1:3000 npm run test:smoke
```

로컬 이미지는 시험용이다. 운영에는 검증된 GHCR digest를 `APP_IMAGE`로 기록한다. 앱 포트는 127.0.0.1에만 바인딩한다. 외부 3000/5432 포트나 Docker 관리 socket을 노출하지 않는다. 앱은 root 이외 계정으로 실행된다.

DB는 `database` profile을 선택할 때만 시작한다. 비밀번호는 저장소 밖 파일에서 Compose secret으로 전달한다. DB 포트는 호스트에 공개하지 않는다. 운영 DB 연결과 readiness 검사는 아직 미구현이다. `/api/health`의 `status: ok`는 앱 응답만 의미하며 DB·인증 미연결 상태를 명시한다.

PostgreSQL 볼륨은 앱 이미지와 분리한다. `docker compose down -v`, 자동 시드, `prisma migrate reset`은 운영 배포에서 사용하지 않는다. DB 백업 복원 검증이 끝나기 전 데이터를 받는 기능을 공개하지 않는다.

## Nginx 전환

1. 기존 Nginx 사이트 파일, 활성 링크, 실제 인증서 경로를 확인하고 설정 사본을 운영 백업 위치에 보관한다.
2. 새 앱을 127.0.0.1:3000에서 실행하고 HTTP 검증을 통과한다.
3. `deploy/nginx/undery.link.conf`를 현재 서비스 경로와 대조한다. 루트 차단은 HTTP·HTTPS·www 모두 적용한다.
4. 관리자 권한으로 설정을 배치하고 `nginx -t`를 통과한 경우에만 reload한다. 실패하면 기존 설정을 유지한다.
5. 외부 네트워크에서 각 영역, 정규화 주소, 루트·우회 주소의 실제 HTTP 상태를 확인한다.
6. 문제 발생 시 백업한 Nginx 설정과 이전 앱 이미지로 복구한다. DB를 자동 과거 시점으로 되돌리지 않는다.

```sh
curl -I http://undery.link/
curl -I https://undery.link/
curl -I https://www.undery.link/
curl -I 'http://www.undery.link/game?source=test'
curl -I https://undery.link/coding
curl -I https://undery.link/develop
```

예상: 세 루트는 404. 정상 영역의 HTTP/www 요청은 경로·쿼리를 보존해 HTTPS apex로 308. 기존 `/develop`은 404. HTTPS canonical 영역은 200. 정상 영역 후행 슬래시는 해당 영역으로 정리된다.

## CI/CD 후속 구현

Jenkinsfile은 원본 저장소 main을 조회하는 검증 파이프라인이다. 외부 PR·fork를 발견하거나 실행하는 작업으로 설정하지 않는다. 빌드 agent는 Node 24와 인터넷 패키지 조회만 필요하며 운영 비밀값과 Docker socket 접근을 부여하지 않는다.

운영 자동 배포는 아직 없다. 후속 작업에서 독립된 rootless 이미지 빌드, GHCR 발행·digest, 배포 직전 최신 커밋 확인, 배포 잠금, 사전 DB 백업, 추가형 migration, 앱 교체, 내부/외부 상태·커밋 확인, 호환되는 이전 이미지 복구를 추가한다. migration 실패 시 중단하고 DB를 무조건 자동 복원하지 않는다.

현재 robots와 페이지 헤더는 검색 수집을 차단한다. 이 설정은 접근 권한이 아니며 URL을 아는 방문자는 공개 화면을 볼 수 있다. 공개 단계에서 검증을 마친 영역의 검색 허용과 개별 사이트맵 제출을 함께 검토한다.
