# 실행·운영 전환 안내

2026-10-19 갱신. 루트 안내 200은 이미 구현되었다. 현재 서버 파일에서 `undery-web.service`의 standalone 실행 설정과 `/opt/personal-site/web/current` → `edddc752...` release를 확인했다. 서비스 상태·외부 HTTP는 이번 제한 환경에서 확인하지 못했다.

관리자 로그인·DB 글 작성의 설치와 복구는 [관리자 운영 안내](ADMIN.md)를 따른다. 이번 변경은 아직 운영에 적용하지 않았다. 기존 systemd 운영을 유지할 수 있으며 Docker 앱으로 전환할 필요는 없다.

## 현재 운영과 개발 분리

`feature/web`와 `codex/coding-design`은 기준 커밋 `edddc752`이며 `main`에는 아직 실행 앱이 없다. 관리자 변경의 병합 대상은 `feature/web`이다. 운영 release와 개발 checkout을 분리하고 검증한 커밋 단위로 배포한다.

대표 HTTPS 루트는 Coding·Game·Whoami 안내와 HTTP 200을 제공한다. `/coding`, `/game`, `/whoami` 직접 접속과 비지원 경로 404를 유지한다.

## 앱과 컨테이너

```sh
docker build --build-arg BUILD_COMMIT=$(git rev-parse HEAD) -t undery-site:foundation .
APP_IMAGE=undery-site:foundation docker compose up -d app
npm run test:smoke # DB/OAuth 없는 별도 시험 프로세스에서 실행
```

로컬 이미지는 시험용이다. 운영에는 검증된 GHCR digest를 `APP_IMAGE`로 기록한다. 앱 포트는 127.0.0.1에만 바인딩한다. 외부 3000/5432 포트나 Docker 관리 socket을 노출하지 않는다. 앱은 root 이외 계정으로 실행된다.

DB는 `database` profile을 선택할 때만 시작한다. 비밀번호는 저장소 밖 파일에서 Compose secret으로 전달한다. 앱 컨테이너를 쓰면 DB 포트는 호스트에 공개하지 않는다. 기존 호스트 systemd 앱을 쓸 때만 별도 host override로 127.0.0.1에 바인딩한다. `/api/health`는 설정된 DB의 공개 글·세션 테이블을 검사하며 실패하면 503을 반환한다. DB 미설정 상태는 `not-connected`, OAuth 미설정은 `not-configured`로 구분한다.

PostgreSQL 볼륨은 앱 이미지와 분리한다. `docker compose down -v`, 자동 시드, `prisma migrate reset`은 운영 배포에서 사용하지 않는다. DB 백업 복원 검증이 끝나기 전 데이터를 받는 기능을 공개하지 않는다.

## Nginx 전환

1. 기존 Nginx 사이트 파일, 활성 링크, 실제 인증서 경로를 확인하고 설정 사본을 운영 백업 위치에 보관한다.
2. 새 앱을 127.0.0.1:3000에서 실행하고 HTTP 검증을 통과한다.
3. `deploy/nginx/undery.link.conf`를 새 앱과 함께 갱신한다. 대표 HTTPS 루트의 앱 전달을 유지하고 HTTP·www 루트는 경로·쿼리를 보존해 대표 HTTPS 주소로 정규화한다. 비지원 주소의 404는 유지한다.
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

정책: HTTPS 대표 루트는 안내 화면 200. HTTP·www 루트는 HTTPS 대표 루트로 308. 정상 영역의 HTTP/www 요청도 경로·쿼리를 보존해 HTTPS apex로 308. 기존 `/develop`과 비지원 경로는 404. HTTPS canonical 영역은 200. 정상 영역 후행 슬래시는 해당 영역으로 정리된다. 새 관리자 기능을 배포할 때도 이 경로 정책을 재검증한다.

## CI/CD 후속 구현

Jenkinsfile은 앱이 있는 원본 저장소 feature/web을 조회하는 검증 파이프라인이다. 외부 PR·fork를 발견하거나 실행하는 작업으로 설정하지 않는다. 빌드 agent는 Node 24와 인터넷 패키지 조회만 필요하며 운영 비밀값과 Docker socket 접근을 부여하지 않는다.

운영 자동 배포는 아직 없다. 후속 작업에서 독립된 rootless 이미지 빌드, GHCR 발행·digest, 배포 직전 최신 커밋 확인, 배포 잠금, 사전 DB 백업, 추가형 migration, 앱 교체, 내부/외부 상태·커밋 확인, 호환되는 이전 이미지 복구를 추가한다. migration 실패 시 중단하고 DB를 무조건 자동 복원하지 않는다.

현재 robots와 페이지 헤더는 검색 수집을 차단한다. 이 설정은 접근 권한이 아니며 URL을 아는 방문자는 공개 화면을 볼 수 있다. 공개 단계에서 검증을 마친 영역의 검색 허용과 개별 사이트맵 제출을 함께 검토한다.
