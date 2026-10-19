# 관리자 로그인과 Coding 글 작성

2026-10-19 구현. 기준은 `feature/web`의 `edddc7521c979ee78ea23ab2cddcdfeed43ce532`이다. 코드 빌드와 단위 검사는 통과했지만 실제 PostgreSQL migration, GitHub 로그인, 브라우저 편집과 운영 배포는 아직 검증하지 않았다. [검증 기록](VERIFICATION.md)의 현재 결과를 먼저 확인한다.

## 작성 방법

설정을 적용한 뒤 `https://undery.link/admin`에서 **GitHub로 로그인**한다. 서버가 GitHub에서 직접 확인한 숫자 ID가 `ADMIN_GITHUB_ID`와 일치할 때만 관리 화면이 열린다. 별도 비밀번호 계정이나 방문자 가입은 없다.

1. **새 글 작성**에서 제목, 요약, 분류, 아이콘, 글 주소와 쉼표로 구분한 태그를 입력한다.
2. 목차별 제목과 Markdown 본문을 작성한다. 목차 추가·삭제·순서 이동과 미리보기를 지원한다.
3. **초안 저장**은 관리자에게만 보인다. 이미 발행한 글을 수정해도 공개본은 그대로다.
4. **발행**은 입력을 먼저 초안으로 저장한 다음 공개본에 반영한다. 빈 본문은 발행할 수 없다. `/coding`의 목록·검색·태그·상세와 Coding 사이트맵에 반영된다.
5. **공개 중지**는 목록과 상세에서 숨긴다. 초안은 유지하며 다시 발행할 수 있다. 처음 발행한 글 주소는 이후 변경할 수 없다.

자동 저장은 없다. 새로고침 전에는 초안을 저장한다. 다른 창에서 먼저 저장한 경우 충돌 안내가 표시되므로 현재 내용을 복사한 뒤 새로고침한다. 본문 내용과 요약을 합친 JSON 요청은 UTF-8 기준 256 KiB까지이며, 한글은 한 글자가 여러 바이트를 사용한다. 목차는 40개, 태그는 12개까지다.

Markdown은 문단, 제목, 코드 블록, 목록, 인용, 표, 간단한 강조, 링크, 이미지를 지원하는 제한된 문법이다. HTML·MDX·스크립트는 실행하지 않는다. 미리보기와 공개 화면은 같은 렌더러를 사용한다.

### 사진

현재는 **이미지 URL** 버튼으로 `![설명](https://...)`을 넣는다. 저장소에 있는 이미지는 `/images/...` 주소를 사용할 수 있다. 외부 이미지 URL은 방문자의 브라우저에서 직접 요청되므로 공개해도 되는 주소만 사용한다. 사진 선택·파일 업로드·VRChat 사진 목록 편집은 이번 기능에 포함하지 않는다.

다음 단계는 이미지 파일을 코드 배포 디렉터리 밖의 영구 저장소에 저장하고, 관리자만 업로드 URL을 발급받는 방식이다. 서버에서 실제 파일 형식·크기·치수를 확인하고 위치 EXIF를 제거한 공개용 이미지와 썸네일을 만든 뒤 DB에 등록한다. 업로드 완료와 공개 발행은 분리한다. 현재 `MediaAsset` 모델은 기반만 있고 업로드 API는 없다. `/opt/personal-site/web/current/public`에 직접 업로드하는 방식은 배포 교체 때 파일을 잃을 수 있으므로 사용하지 않는다.

## GitHub OAuth 설정

GitHub 계정 Settings → Developer settings → OAuth Apps에서 애플리케이션을 등록한다.

| 항목                       | 값                                             |
| -------------------------- | ---------------------------------------------- |
| Application name           | 원하는 관리용 이름                             |
| Homepage URL               | `https://undery.link`                          |
| Authorization callback URL | `https://undery.link/api/auth/github/callback` |
| 허용 관리자                | Undery33 숫자 ID `127064386`                   |

Client ID와 새 Client secret을 운영 환경 파일에 입력한다. 비밀값은 채팅·Git·Jenkins 로그에 붙이지 않는다. GitHub 저장소 접근 권한이나 이메일 권한을 요청하지 않는다. 로그인마다 토큰으로 `/user`를 조회해 실제 숫자 ID를 재확인한다.

이 변경은 기존 의존성으로 GitHub authorization-code + S256 PKCE 흐름과 서버 세션을 구현했다. 인증 라이브러리를 새로 설치한 구현은 아니다. 로컬 실행 환경의 네트워크 제한으로 새 패키지 설치가 불가능했으며, 실제 OAuth 연동 검증은 필수 배포 조건으로 남아 있다. 향후 라이브러리로 전환하더라도 숫자 ID 검증·세션·초안 분리 조건을 유지한다.

## DB와 환경 파일

운영 환경 파일의 템플릿은 `.env.example`이다. `/etc/undery/app.env`를 root 소유, 모드 `0600`으로 만들고 아래 키를 설정한다. `DATABASE_URL`의 비밀번호 등은 URL 인코딩한다. 파일 안에 `export`나 셸 명령을 쓰지 않는다.

```dotenv
SITE_URL=https://undery.link
DATABASE_URL=postgresql://USER:URL_ENCODED_PASSWORD@127.0.0.1:5432/undery
GITHUB_CLIENT_ID=실제_Client_ID
GITHUB_CLIENT_SECRET=실제_Client_secret
ADMIN_GITHUB_ID=127064386
```

현재 호스트의 systemd 앱을 유지할 경우 DB는 호스트에서 접근 가능해야 한다. 2026-10-19 사용자가 제공한 결과로 웹 서비스 active, 실행 중인 Docker 컨테이너 없음, TCP 5432 리스너 없음, OAuth 환경 파일 저장 완료를 확인했다. 중지된 컨테이너·기존 볼륨은 별도 확인이 필요하다. 기존 PostgreSQL이 있다면 그 운영 구성과 백업을 먼저 확인한다. 새 DB가 필요하면 저장소의 PostgreSQL Compose 서비스를 선택적으로 사용할 수 있다. 아래는 **설치 담당자가 검토 후 실행할 예시**이며 이번 작업에서 실행하지 않았다.

```sh
# 기존 서버의 root 터미널에서 신뢰한 checkout의 스크립트를 실행한다.
python3 scripts/prepare-host-database.py --check
python3 scripts/prepare-host-database.py
```

스크립트는 Docker 상태, 5432 바인딩, 기존 볼륨·컨테이너·자격증명을 먼저 확인한다. 이미 구성된 DB가 있으면 덮어쓰거나 초기화하지 않고 중단한다. 중단/실패 시 파일·볼륨을 임의로 지우지 말고 상태를 확인한다.

새 구성이면 PostgreSQL 17 컨테이너만 시작한다. bootstrap `postgres`와 앱 `undery`의 비밀번호를 각각 무작위 생성하고 `/etc/undery/`에 0600으로 저장한다. 앱 계정에는 superuser·DB/role 생성 권한을 주지 않는다. `undery`와 `undery_test` DB를 만든 후 OAuth 설정을 유지하면서 app.env의 빈 DATABASE_URL을 갱신한다. 기존 환경 파일도 비공개로 백업한다. `/etc/undery/test.env`에는 시험 DB 전용 연결 정보를 기록한다. 비밀번호는 출력하지 않는다.

호스트용 Compose override는 bootstrap 계정과 healthcheck를 postgres로 설정한다. override만 직접 시작하면 앱 역할·DB는 아직 없으므로 위 스크립트의 후속 생성 절차가 필요하다. 스크립트는 웹 서비스 재시작, 운영 migration, 배포를 수행하지 않는다.

5432는 `127.0.0.1`에만 바인딩한다. 이미 쓰는 포트라면 새 DB를 시작하지 말고 기존 DB 구성을 확인한다. DB 데이터는 별도 named volume에 남는다. 앱까지 Compose로 운영하면 호스트용 override 없이 내부 주소 `db:5432`를 사용한다. Docker socket 권한을 CI에 추가하지 않는다.

### Migration과 사전 검증

운영 데이터가 있으면 `pg_dump` 백업을 만들고 별도 시험 DB로 복구하여 migration을 먼저 검증한다. 연결 정보는 비공개 PostgreSQL 서비스/패스워드 파일 등 운영 절차로 주입한다. 백업 파일을 저장소에 넣지 않는다.

`202610190001_admin_posts`는 공개 글의 기존 Markdown을 첫 목차로 보존하고, 별도 초안·로그인 시도·세션 테이블을 만든다. 기존 `WEB`/`PROGRAMMING` 글이 있으면 의미를 임의로 바꾸지 않고 migration 전체를 중단한다. 그 경우 기존 `INFRASTRUCTURE`/`NETWORK` 중 맞는 분류로 옮길 수 있는지 검토하거나, 새 분류를 사용하는 별도 데이터 이전안을 작성해야 한다. 실패한 Prisma migration은 실제 SQL 롤백 상태를 확인한 뒤에만 `migrate resolve --rolled-back`으로 처리한다.

의존성이 설치된 **소스 checkout**에서 해당 DB의 `DATABASE_URL`을 주입한 다음 실행한다. standalone 배포 산출물에는 migration CLI가 포함된다고 가정하지 않는다.

```sh
npm run db:generate
npm run db:migrate
```

통합 검사용 DB는 이름이 `_test`로 끝나는 별도 데이터베이스를 사용한다. 같은 migration을 먼저 적용하고 해당 URL을 `ADMIN_TEST_DATABASE_URL` 환경변수에만 넣은 뒤 실행한다.

```sh
npm run test:admin:db
```

이 검사는 초안 비공개, 최초 발행, 공개본과 편집 중 초안의 분리, 동시 수정 충돌, 중복 주소의 트랜잭션 롤백, 공개 중지와 재발행을 실제 PostgreSQL에서 검사한다. 검사가 만든 행만 지우며 DB reset/seed는 하지 않는다. 실제 GitHub 로그인과 HTTP·브라우저 검사를 대체하지 않는다.

## 기존 systemd 서비스에 적용

2026-10-19 파일 확인 기준으로 `undery-web.service`는 `/opt/personal-site/web/current/server.js`를 Node 24.20.0으로 실행하도록 설정되어 있다. `current`는 `edddc752...` release를 가리켰다. 서비스 버스 접근이 차단되어 실제 프로세스 상태를 확인한 것은 아니다.

1. 현재 release symlink와 Nginx 설정을 백업한다. 새 DB 사용 시 백업·복원 절차까지 확인한다.
2. 새 브랜치의 정확한 커밋을 별도 checkout에서 `npm ci`, `npm run check`, `BUILD_COMMIT=$(git rev-parse HEAD) npm run build`, `npm run test:smoke`로 검증한다. smoke는 DB/OAuth가 없는 별도 프로세스에서만 실행한다.
3. 시험 DB migration·`test:admin:db`를 통과시키고 시험 환경에서 아래 수동 검사를 마친다. 운영 DB는 백업 후 같은 추가형 migration을 적용한다.
4. `.next/standalone/` 내용 전체를 **새** `/opt/personal-site/web/releases/<검증한 커밋>/`에 복사한다. 빌드 스크립트가 public과 정적 파일도 포함한다. 실행 중 release 디렉터리에 덮어쓰지 않는다.
5. `/etc/undery/app.env`를 만들고 `deploy/systemd/admin.conf`를 `/etc/systemd/system/undery-web.service.d/admin.conf`에 설치한다. 기존 DynamicUser·캐시 BindPaths·하드닝을 유지한다. 새 release의 `.next/cache` 디렉터리를 확인한다.
6. `deploy/nginx/undery.link.conf`의 변경을 실제 활성 설정에 반영한다. 인증 경로 로그·요청 빈도 제한과 관리자 JSON 256 KiB 제한이 포함되어 있다. `limit_req_zone`은 http 컨텍스트에 한 번만 선언한다. `nginx -t` 실패 시 reload하지 않는다.
7. 준비가 끝나면 `current` symlink를 새 release로 원자적으로 교체하고 다음을 실행한다.

```sh
sudo systemctl daemon-reload
sudo systemctl restart undery-web
sudo nginx -t
sudo systemctl reload nginx
curl --fail http://127.0.0.1:3000/api/health
curl --fail https://undery.link/api/health
```

health의 `commit`이 선택한 커밋이며 `checks.database`가 `ok`, `checks.authentication`이 `configured`인지 확인한다. `configured`는 환경변수 형식만 확인한 상태이며 GitHub 로그인 성공을 의미하지 않는다. DB가 설정됐지만 연결 또는 테이블 확인이 실패하면 HTTP 503이다.

실패하면 기록한 이전 release로 symlink를 되돌리고 재시작한다. DB는 자동으로 과거 시점으로 되돌리지 않는다. 이전 앱이 DB 글 조회를 지원하지 않으면 저장된 글이 잠시 화면에 보이지 않을 수 있지만 데이터는 유지된다. 인증을 즉시 닫으려면 환경 파일에서 OAuth 설정을 제거하고 재시작한다.

### 실제 로그인 후 확인할 항목

- Undery33 로그인 성공과 `/admin` 복귀, 다른 GitHub 계정 거절, 취소·잘못된 state·재사용 callback 거절.
- 쿠키의 Secure·HttpOnly·SameSite=Lax·Path=/, 8시간 만료, 로그아웃 후 이전 세션 사용 거절.
- 비로그인 글 작성·저장·발행 거절, 로그인 상태에서도 누락/변조 CSRF와 다른 Origin 거절.
- 초안 작성 → 공개 목록/상세에 없음 → 발행 → 새 브라우저에서 표시 → 초안 수정 중 기존 공개본 유지 → 재발행 → 공개 중지.
- 두 탭에서 같은 글 편집 시 뒤늦은 저장이 409로 거절되는지 확인.
- 데스크톱/모바일 편집, 한글 입력, 미리보기·목차 이동·이미지 표시, 네트워크 실패 시 입력 보존.

## 이번 세션에서 필요한 접근

실행 정책이 TCP 포트 바인딩, systemd 버스, Docker socket, 네트워크 패키지 조회를 차단했다. `/etc`·`/opt` 운영 경로 쓰기도 허용되어 있지 않다. 사용자 의사와 별개로 현재 도구의 권한 상승 요청은 자동 거절되는 정책이다. 따라서 이번 세션에서 서비스 설치나 로그인 성공을 주장할 수 없다.

다음 작업 환경에서는 필요한 서버 명령·경로에 대한 실행 권한을 설정하거나, 위 준비물을 운영 담당자가 적용해야 한다. 추가로 비공개 환경 파일에 실제 PostgreSQL 연결 정보와 GitHub Client ID/secret이 있어야 한다. 비밀값을 대화로 전달할 필요는 없다.
