# 관리자 로그인과 Coding 글 작성

2026-10-19 구현. 기준은 `feature/web`의 `edddc7521c979ee78ea23ab2cddcdfeed43ce532`이다. 코드 빌드와 단위 검사에 이어 사용자 서버에서 시험 DB 통합 검사 1개와 HTTP 검사 68개가 통과했다. 운영 release가 앱 커밋 `9378c630`으로 전환된 것을 확인했으며 사용자가 실제 GitHub 로그인 성공을 보고했다. 브라우저의 초안 저장·발행·공개 중지와 로그아웃 확인은 남아 있다. [검증 기록](VERIFICATION.md)의 현재 결과를 먼저 확인한다.

사용자 아이콘·본문 드래그 이미지·VRChat 사진 관리가 후속 구현됐다. 현재 운영에는 아직 반영하지 않았으며 [미디어 사용·배포 안내](MEDIA.md)의 전환을 완료한 뒤 사용한다.

## 작성 방법

설정을 적용한 뒤 `https://undery.link/admin`에서 **GitHub로 로그인**한다. 서버가 GitHub에서 직접 확인한 숫자 ID가 `ADMIN_GITHUB_ID`와 일치할 때만 관리 화면이 열린다. 별도 비밀번호 계정이나 방문자 가입은 없다.

1. **새 글 작성**에서 제목, 요약, 분류, 아이콘, 글 주소와 쉼표로 구분한 태그를 입력한다.
2. 목차별 제목과 Markdown 본문을 작성한다. 목차 추가·삭제·순서 이동과 미리보기를 지원한다.
3. **초안 저장**은 관리자에게만 보인다. 이미 발행한 글을 수정해도 공개본은 그대로다.
4. **저장 후 발행**은 입력을 먼저 초안으로 저장한 다음 공개본에 반영한다. 빈 본문은 발행할 수 없다. `/coding`의 목록·검색·태그·상세와 Coding 사이트맵에 반영된다.
5. **공개 중지**는 목록과 상세에서 숨긴다. 초안은 유지하며 다시 발행할 수 있다. 처음 발행한 글 주소는 이후 변경할 수 없다.

자동 저장은 없다. 새로고침 전에는 초안을 저장한다. 다른 창에서 먼저 저장한 경우 충돌 안내가 표시되므로 현재 내용을 복사한 뒤 새로고침한다. 본문 내용과 요약을 합친 JSON 요청은 UTF-8 기준 256 KiB까지이며, 한글은 한 글자가 여러 바이트를 사용한다. 목차는 40개, 태그는 12개까지다.

Markdown은 문단, 제목, 코드 블록, 목록, 인용, 표, 간단한 강조, 링크, 이미지를 지원하는 제한된 문법이다. HTML·MDX·스크립트는 실행하지 않는다. 미리보기와 공개 화면은 같은 렌더러를 사용한다.

### 사진과 사용자 아이콘

후속 미디어 버전에서 **사용자 아이콘 추가**로 이름과 이미지 파일을 등록해 재사용할 수 있다. 본문에 사진을 드래그하거나 **이미지 추가**로 선택하면 본문 사이에 표시된다. **Markdown 원문**으로 전환해 직접 수정할 수도 있다. 기존 **이미지 주소** 삽입도 유지한다.

관리자 홈의 **VRChat 사진 관리**는 기존 여섯 사진과 새 사진의 파일·제목·설명·월·태그·표시 순서·공개 여부를 관리한다. **초안 저장**은 기존 공개본을 유지하고 **저장 후 공개**가 실제 화면에 반영한다. 자세한 사용법, 파일 제한, 영구 저장 경로와 현재 서버 적용 명령은 [MEDIA.md](MEDIA.md)를 따른다.

## GitHub OAuth 설정

GitHub 계정 Settings → Developer settings → OAuth Apps에서 애플리케이션을 등록한다.

| 항목                       | 값                                             |
| -------------------------- | ---------------------------------------------- |
| Application name           | 원하는 관리용 이름                             |
| Homepage URL               | `https://undery.link`                          |
| Authorization callback URL | `https://undery.link/api/auth/github/callback` |
| 허용 관리자                | Undery33 숫자 ID `127064386`                   |

Client ID와 새 Client secret을 운영 환경 파일에 입력한다. 비밀값은 채팅·Git·Jenkins 로그에 붙이지 않는다. GitHub 저장소 접근 권한이나 이메일 권한을 요청하지 않는다. 로그인마다 토큰으로 `/user`를 조회해 실제 숫자 ID를 재확인한다.

이 변경은 기존 의존성으로 GitHub authorization-code + S256 PKCE 흐름과 서버 세션을 구현했다. 인증 라이브러리를 새로 설치한 구현은 아니다. 로컬 실행 환경의 네트워크 제한으로 새 패키지 설치가 불가능했다. 사용자 보고로 실제 로그인 성공을 확인했으며 다른 계정 거절·세션 종료 등 나머지 운영 인증 검사는 아래 목록에 남아 있다. 향후 라이브러리로 전환하더라도 숫자 ID 검증·세션·초안 분리 조건을 유지한다.

## DB와 환경 파일

운영 환경 파일의 템플릿은 `.env.example`이다. `/etc/undery/app.env`를 root 소유, 모드 `0600`으로 만들고 아래 키를 설정한다. `DATABASE_URL`의 비밀번호 등은 URL 인코딩한다. 파일 안에 `export`나 셸 명령을 쓰지 않는다.

```dotenv
SITE_URL=https://undery.link
DATABASE_URL=postgresql://USER:URL_ENCODED_PASSWORD@127.0.0.1:5432/undery
GITHUB_CLIENT_ID=실제_Client_ID
GITHUB_CLIENT_SECRET=실제_Client_secret
ADMIN_GITHUB_ID=127064386
```

현재 호스트의 systemd 앱을 유지할 경우 DB는 호스트에서 접근 가능해야 한다. 2026-10-19 최초 점검에서 사용자는 웹 서비스 active, 실행 중인 Docker 컨테이너 없음, TCP 5432 리스너 없음, OAuth 환경 파일 저장 완료를 보고했다. 이후 사용자가 아래 준비 스크립트 완료와 시험 DB 통합 검사 통과를 보고했다. 아래는 신규 설치 절차의 기록이며 현재 서버에서 재실행하지 않는다. 다른 서버에 적용할 때는 기존 컨테이너·볼륨·PostgreSQL 구성과 백업을 먼저 확인한다.

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

2026-10-19 확인한 현재 release와 Nginx/systemd 설정을 대상으로 배포 스크립트를 준비했다. `deploy/admin-source.json`의 앱 커밋 `9378c630d1a6049bdc38c64e91ada63d796b46a5`와 빌드 입력 파일의 Git blob SHA를 확인하며, 현재 운영 release가 `edddc752...`가 아니거나 기존 설정이 바뀌면 중단한다. 일반 배포 도구가 아닌 이번 관리자 기능의 첫 전환용이다.

이 첫 전환은 이미 수행됐다. 현재 release가 `9378c630...-admin-20261019T134814443732Z`를 가리키므로 아래 `--apply`를 다시 실행하지 않는다. 후속 코드 배포에는 새 기준에 맞는 별도 배포 절차가 필요하다.

신뢰한 checkout의 **서버 root 터미널**에서 실행한다. 기본 실행은 사전 검사이며, `--apply`를 지정하면 실제 운영 변경을 시작한다.

```sh
python3 scripts/deploy-host-admin.py
python3 scripts/deploy-host-admin.py --apply
```

실행 순서:

1. 소스·환경 파일·서비스·DB·시험 포트를 확인하고 배포 잠금을 잡는다.
2. 정확한 앱 커밋 번호로 빌드한다. 비밀값은 빌드에 주입하지 않는다. HTTP 검사와 시험 DB 통합 검사를 다시 실행한다.
3. `/var/backups/undery-site/deploy-<시간>/`에 현재 웹 설정, 복구 정보, 비공개 로그와 운영 DB custom dump를 저장한다. 새 임시 DB에 dump를 복원하고 성공한 임시 DB만 제거한다.
4. 운영 DB에 `migrate deploy`를 적용한다. 새 release 디렉터리에 standalone을 복사하고 일반 파일/디렉터리를 DynamicUser가 읽을 수 있도록 설정한다.
5. 3102 포트의 후보 서버에서 운영 DB 연결, 인증 환경 설정과 관리자 로그인 화면을 확인하고 종료한다.
6. Nginx 설정을 검사하고 OAuth 환경 파일과 BUILD_COMMIT drop-in을 설치한다. 기존 하드닝은 유지한다. current symlink를 원자적으로 교체하고 Nginx reload와 웹 재시작을 수행한다.
7. 3000 포트와 로컬 TLS Nginx를 경유한 `https://undery.link/api/health`에서 커밋/DB 상태를 확인한다. 외부 네트워크 접속과 GitHub 실제 인증은 다음 브라우저 확인에서 수행한다.

전환 후 검사 실패 시 이전 symlink와 Nginx/systemd drop-in을 복구한다. 운영 DB migration을 자동으로 되돌리지 않는다. 정상 종료 시 출력된 다음 명령으로 수동 복구할 수도 있다.

```sh
python3 scripts/deploy-host-admin.py --rollback /var/backups/undery-site/deploy-실제출력된시간
```

다른 작업이 current/Nginx/drop-in을 변경한 경우 복구 스크립트도 덮어쓰지 않고 중단한다. 실패 출력과 백업 경로를 먼저 확인한다. 배포 로그·DB dump·환경 파일에는 민감한 정보가 있을 수 있으므로 저장소나 채팅에 그대로 올리지 않는다.

health의 `checks.authentication=configured`는 환경 설정 검사를 의미하며 GitHub 로그인 성공을 의미하지 않는다. 적용 후 `/admin`에서 실제 로그인과 다음 항목을 확인한다. 초기 전환 동안 웹 재시작으로 짧은 연결 중단이 발생할 수 있다.

### 실제 로그인 후 확인할 항목

- Undery33 로그인 성공과 `/admin` 복귀, 다른 GitHub 계정 거절, 취소·잘못된 state·재사용 callback 거절.
- 쿠키의 Secure·HttpOnly·SameSite=Lax·Path=/, 8시간 만료, 로그아웃 후 이전 세션 사용 거절.
- 비로그인 글 작성·저장·발행 거절, 로그인 상태에서도 누락/변조 CSRF와 다른 Origin 거절.
- 초안 작성 → 공개 목록/상세에 없음 → 발행 → 새 브라우저에서 표시 → 초안 수정 중 기존 공개본 유지 → 재발행 → 공개 중지.
- 두 탭에서 같은 글 편집 시 뒤늦은 저장이 409로 거절되는지 확인.
- 데스크톱/모바일 편집, 한글 입력, 미리보기·목차 이동·이미지 표시, 네트워크 실패 시 입력 보존.

## 이번 세션에서 필요한 접근

실행 정책이 TCP 포트 바인딩, systemd 버스, Docker socket, 네트워크 패키지 조회를 차단했다. `/etc`·`/opt` 운영 경로 쓰기도 허용되어 있지 않다. 사용자 의사와 별개로 현재 도구의 권한 상승 요청은 자동 거절되는 정책이다. 운영 작업은 사용자의 서버 터미널에서 진행됐다. 현재 release 경로는 읽기로 확인했고 로그인 성공은 사용자 보고이며, Codex가 직접 서비스를 변경하거나 브라우저 로그인을 관찰한 것으로 기록하지 않는다.

후속 운영 변경에도 필요한 서버 명령·경로에 대한 실행 권한을 설정하거나 운영 담당자가 검토된 명령을 실행해야 한다. 비공개 환경 파일의 PostgreSQL 연결 정보와 GitHub Client ID/secret은 서버에 유지한다. 비밀값을 대화로 전달할 필요는 없다.
