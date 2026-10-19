# 기반 구현 검증 기록

## 2026-10-19 — 운영 release 전환과 사용자 로그인 확인

- 서버 파일 읽기로 `/opt/personal-site/web/current`가 `/opt/personal-site/web/releases/9378c630d1a6049bdc38c64e91ada63d796b46a5-admin-20261019T134814443732Z`를 가리키는 것을 확인했다. 관리자 앱의 실제 배포 버전은 `9378c630`이며 후속 배포 도구·문서 커밋과 구분한다.
- 사용자가 “로그인 완료”를 보고했다. 실제 관리자 로그인 성공의 사용자 확인으로 기록한다. 브라우저 DOM이나 작성 요청 응답을 직접 관찰한 결과는 아니다.
- 운영 release 전환과 로그인 성공을 확인했지만, 전체 배포 출력·운영 백업 파일·live health 응답은 이번 확인에서 직접 조회하지 않았다. 배포 도구의 절차가 있다는 사실을 각 운영 검사를 직접 수행한 증거로 대체하지 않는다.
- 남은 확인은 브라우저에서 초안 저장 후 다시 열기, 발행 후 공개 글 표시, 수정 초안과 공개본 분리, 공개 중지, 로그아웃과 이전 세션 거절이다. 다른 GitHub 계정 거절 등 운영 인증의 나머지 항목도 별도 확인 대상이다.
- 이번 변경은 검증 기록과 운영 안내 문서만 갱신했다. 앱 코드·DB·서비스를 변경하지 않았다. 첫 전환용 `deploy-host-admin.py --apply`는 이미 바뀐 운영 release에 재실행하지 않는다.

## 2026-10-19 22:30~22:35 KST — 사용자 서버 검증 통과와 배포 준비

- 사용자가 prepare-host-database.py 완료 메시지를 전달했다. 서버에 PostgreSQL과 운영/시험 DB 준비 단계가 완료됐다는 운영자 실행 결과다. Codex 실행 환경의 서비스·소켓 제한은 유지된다.
- 사용자가 안내된 시험 DB migration + 통합 검사 명령의 결과를 전달했다: tests 1, pass 1, fail 0, duration 487.690813ms. 초안 분리·발행·수정 충돌·중복 주소 롤백·공개 중지·재발행이 실제 시험 DB에서 검증됐다. 개별 migration 출력은 별도로 전달받지 않았으므로 위 결과를 근거로 기록한다.
- 사용자가 실제 서버의 HTTP smoke 결과를 전달했다: PASS 68 HTTP checks. 기존 페이지, 검색/태그, 메타데이터/사이트맵, 미지원 경로 404, 비로그인 작성 API 거절이 통과했다. 앞선 제한 환경의 HTTP 실패 기록을 이 운영자 실행 결과로 보완한다.
- scripts/deploy-host-admin.py와 deploy/admin-source.json 추가. 앱 커밋 9378c630d1a6049bdc38c64e91ada63d796b46a5의 빌드 입력·공개 자산·migration·검사·Nginx 파일 118개의 Git blob SHA를 로컬 파일과 대조했다. 새 배포 도구/문서는 후속 커밋으로 보존하며 앱의 BUILD_COMMIT은 검증한 9378c630으로 고정한다. 합성 로컬 Git HEAD를 배포 버전으로 사용하지 않는다.
- 배포 스크립트는 exact-source 빌드와 HTTP/시험 DB 검사를 다시 실행하고 운영 DB 백업을 별도 DB에 복원한다. 운영 migration 후 후보 서버를 확인하고 Nginx 검사, 환경 파일 연결, release symlink 전환, systemd 재시작, 내부/TLS Nginx health 확인을 수행하도록 작성했다. 전환 후 실패하면 이전 release와 웹 설정을 복구하고 DB는 유지한다. 이 배포 절차 자체는 아직 실제 서버에서 실행하지 않았다.
- 이번 배포 도구 추가 후 npm run check(47개 검사/ESLint/TypeScript/Prisma)와 BUILD_COMMIT=9378c630d1a6049bdc38c64e91ada63d796b46a5 빌드를 다시 통과했다. 제한 실행 환경의 HTTP 재시도는 서버 시작 권한 오류로 중단됐다. 배포 도구는 새 커밋 표시로 빌드한 산출물에 대해 서버 터미널에서 HTTP 검사를 다시 통과시킨 뒤 운영 변경을 시작한다.
- Python 검사 5개 통과(기존 DB 준비 보호 2개 + release 복구 3개). 실제 파일/링크 복구, 운영자가 중간에 바꾼 설정 보존, 일반 디렉터리의 링크 교체 거절을 확인했다. 실제 systemd/Nginx 실행의 검증을 대체하지 않는다.
- 아직 남은 검증: 운영 배포 스크립트 실행 결과, 외부 브라우저의 GitHub 로그인, 다른 계정 거절, 세션/CSRF/로그아웃, 편집·발행·공개 중지 흐름. HTTP smoke가 인증된 작성 흐름을 검증한 것으로 해석하지 않는다.

## 2026-10-19 — 서버 DB 준비 절차 추가

- 사용자 터미널 결과: undery-web active, 실행 중인 Docker 컨테이너 없음, TCP 5432 리스너 없음. 사용자가 OAuth 환경 파일 저장 완료를 알렸다. 비밀값은 읽거나 대화에 출력하지 않았다.
- scripts/prepare-host-database.py 추가: 기존 대상 볼륨/컨테이너/자격증명/설정된 DATABASE_URL이 있으면 중단한다. 신규 구성에서만 PostgreSQL을 loopback 포트로 시작하고 bootstrap postgres와 별도 non-superuser 앱 계정을 만든다. 운영/시험 DB를 분리하며 OAuth 환경 파일을 비공개 백업 후 DB URL만 갱신한다. 웹 서비스 재시작과 migration은 수행하지 않는다.
- Python 단위 검사 2개 통과: 기존/중복 DATABASE_URL 거절, 자격증명 파일의 0600과 덮어쓰기 거절. 스크립트 구문/--help 확인. 실제 Docker provisioning 실행을 검증한 것은 아니다.
- 기존 npm run check 재실행 통과: 47개 검사, ESLint/TypeScript/Prisma. BUILD_COMMIT=admin-database-setup-local 프로덕션 빌드 통과. HTTP smoke는 현재 실행 정책의 서버 실행 제한으로 여전히 미통과다.
- systemctl 읽기 재시도도 Operation not permitted로 거절됐다. 서버 DB 준비 스크립트의 실제 실행과 출력 확인은 사용자 터미널에서 필요하다.

## 2026-10-19 — 관리자 GitHub 로그인과 Coding 초안·발행

- 기준: 원격 `feature/web`와 `codex/coding-design`의 `edddc7521c979ee78ea23ab2cddcdfeed43ce532`. `main`에는 앱이 없어 작업 기준으로 사용하지 않았다. 로컬은 GitHub 파일을 읽어 구성한 snapshot이므로 검증용 로컬 Git 이력을 upstream 이력으로 취급하지 않는다. 원격 변경은 원본 commit/tree를 부모·기반으로 연결한다.
- Node 24.20.0, npm 11.19.0, Next.js 16.3.6, Prisma 6.19.3. 네트워크 패키지 조회가 차단되어 기존 npm 캐시에서 잠금 파일의 의존성을 설치했다. 새 의존성은 추가하지 않았다. Prisma 캐시 경로만 쓰기 가능한 임시 위치로 지정해 client 생성을 완료했다.
- 최종 `XDG_CACHE_HOME=/tmp/introduce-page-prisma-cache npm run check` 통과: ESLint, Next route type 생성, TypeScript, **실제 단위/직접 handler 검사 47개**, Prisma schema validation. 기존 35개와 관리자 관련 12개다. 인증 미설정 시 닫힘, 실제 숫자 ID, PKCE/state 구성, Origin, 모의 GitHub 교환 후 ID 확인, 직접 작성 handler 거절, JSON 바이트 제한, 입력 규칙, 안전한 Markdown 출력을 포함한다. 실제 GitHub 인증 검사는 아니다.
- `tsx --test` CLI는 제한 환경에서 IPC 소켓 생성이 거절됐다. Node 24의 `--import tsx --test --test-isolation=none`으로 실제 47개 test case 실행을 확인하고 npm 스크립트에 적용했다. 단순 파일 개수만 출력된 실행을 47개 통과 근거로 사용하지 않았다.
- 최종 `BUILD_COMMIT=admin-posts-local XDG_CACHE_HOME=/tmp/introduce-page-prisma-cache npm run build` 통과. TypeScript CLI subprocess가 제한 환경에서 실패해 Next의 TypeScript 5 in-process 검사와 worker threads를 사용한다. 관리자 및 API의 동적 route와 standalone 산출물을 생성했다. typecheck를 끄거나 오류를 무시하지 않았다.
- **HTTP smoke 미통과/환경 차단:** `npm run test:smoke`를 실행했으나 standalone 프로세스 시작에 실패했다. 직접 같은 서버를 실행하여 `listen EPERM: operation not permitted 127.0.0.1:3101`을 확인했다. HTTP 응답, 관리자 실제 화면·모바일·IME 상호작용을 이번 세션에서 검증했다고 주장하지 않는다. 기존 2026-10-06 HTTP 성공 기록은 이번 변경의 검증 근거가 아니다.
- 실제 PostgreSQL migration/저장·발행 검사는 아직 실행하지 않았다. 별도 `_test` DB에서 실행할 `npm run test:admin:db`를 추가했다. 초안 격리, 공개본 유지, 버전 충돌, 중복 slug 롤백, 공개 중지·재발행 검사를 준비했으며 테스트 코드 존재를 실행 성공으로 간주하지 않는다.
- 서버 파일 읽기에서 기존 standalone release 경로와 systemd/Nginx 설정을 확인했다. systemd 버스 및 Docker socket 접근은 거절됐다. `/etc`·`/opt` 쓰기, 서비스 교체·재시작, 운영 DB 변경, OAuth App 등록은 수행하지 않았다. 실제 비밀값을 읽거나 저장소에 기록하지 않았다.
- 보완: CI의 앱 없는 main checkout을 feature/web으로 변경한 설정안, Prisma 생성이 가능한 Docker 빌드 순서, DB 연결 health, Nginx 인증 요청 제한·callback 접근 로그 제외·관리자 본문 크기 제한, systemd 환경 파일 drop-in과 호스트 DB용 loopback override를 준비했다. Jenkins 작업이나 Nginx 운영 설정에 적용한 것은 아니다.
- 다음 필수 검증은 ADMIN.md의 DB migration/통합 검사, GitHub 실제 로그인과 다른 계정 거절·세션/CSRF·로그아웃, 브라우저 편집부터 공개 중지까지의 흐름, 기존 HTTP 회귀 검사다. 이 확인 전에는 초안 PR을 배포 완료로 취급하지 않는다.

## 2026-10-06 — Coding 한글 입력·다중 태그·이동 경로 보완

- 검색창의 제어값을 URL 대신 동기적인 로컬 입력 상태로 관리한다. IME 조합 중에는 주소 쓰기를 보류하고 조합 완료 시 반영하며, 지연된 자기 URL 갱신은 최신 입력을 덮어쓰지 않는다. 외부 이동과 뒤로 가기는 주소의 검색어를 복원한다.
- 한글 조합 단계 `ㅎ → 하 → 한 → 한ㄱ → 한글`, 조합 완료, 조합 중 지연된 URL 반영, 빠른 영문·공백 입력, 검색어 지우기의 분류·다중 태그 유지, 외부 주소 복원에 대한 상태 회귀 검사 7개를 추가했다. 이는 조합 상태 전이 검사이며 운영체제의 실제 IME 키 입력을 자동화한 검사는 아니다.
- 실제 개발 브라우저에서 `한글 입력 확인` 연속 입력, DNS+Ubuntu 동시 선택 시 Ubuntu 1건, Rocky Linux 추가 시 0건, 개별 토글 해제, 검색어와 태그 결합, 뒤로 가기 복원을 확인했다. 태그는 현재 분류의 자료에서 추리며 버튼 위의 제목·안내 문구는 표시하지 않는다. 카드 태그는 기존 선택에 추가하고 모든 선택 태그를 만족하는 결과만 표시한다.
- 큰 분류 제목 → Coding HOME `/coding`, 브랜드 로고 → 메인 `/` 이동을 실행했다. 브랜드의 `|` 문자를 실제 1px 구분선으로 바꿨다. 카드·최근 카드·상세의 날짜는 오른쪽에 `YYYY.MM.DD`만 표시한다.
- 1440px 데스크톱과 390px 모바일에서 태그·로고·날짜 배치를 확인했다. 모바일 본문 가로 넘침과 중첩 링크는 없었고 브라우저 실행 오류도 없었다. 최종 화면은 저장소 외부 `output/coding-verification/coding-ime-tags.jpg`에 보관했다.
- 최종 `npm run check`(단위 검사 35개·ESLint·TypeScript·Prisma), `npm run build`, `CODING_PREVIEW=1` 운영 실행의 `npm run test:smoke`(HTTP 61개)가 통과했다. HTTP 검사는 새 로고·제목 이동 경로, 얇은 선 마크업, 다중 태그·검색어 보존도 확인한다. `.next/static`과 독립 실행 정적 산출물에는 예시 식별자·제목·설정 문자열이 없다. 검증 후 개발 미리보기 3006을 예시 설정으로 다시 시작했다. 운영 배포와 DB 변경은 하지 않았다.

## 2026-10-06 — Coding 즉시 검색·태그 필터·업데이트 날짜

- HOME과 분류의 검색 입력을 클라이언트 필터에 바로 연결했다. 버튼 제출이나 입력 지연 없이 결과를 갱신하고 native history로 URL을 유지한다. 태그는 분류·검색어와 AND로 적용하며 카드 링크와 별도 링크로 구성한다.
- 실제 개발 브라우저에서 HOME에 `u` 한 글자를 입력해 클릭 없이 Ubuntu 1건이 나타나는 것을 확인했다. 연속 입력·공백 유지, 없는 결과, 태그 선택·개별 해제, 상세 이동 후 뒤로 가기의 검색어 복원을 확인했다. 두 글자 이상은 기존 본문 포함 검색을 유지한다.
- 카드 하단·최근 카드·상세 헤더의 오른쪽에서 업데이트 날짜를 확인했다. 예시는 ‘예시 날짜’로 표시한다. 1440px와 320px에서 날짜·태그·본문 가로 넘침이 없었고 DOM의 중첩 링크는 0개였다.
- 검토 중 예시 모듈이 클라이언트 빌드에 포함되는 문제를 발견해 서버 자료 조회를 `coding-store.ts`로 분리했다. 공용 `coding.ts`는 필터·타입만 제공하며 서버 페이지에서 읽은 공개 자료만 클라이언트에 전달한다.
- 분리 후 최종 `npm run check`(단위 검사 24개·ESLint·TypeScript·Prisma), `npm run build`, `CODING_PREVIEW=1` 운영 실행의 `npm run test:smoke`(HTTP 60개) 모두 통과했다. `.next/static`과 독립 실행 산출물의 정적 파일에서 예시 식별자·제목·예시 설정 문자열은 모두 0건이었다. 새 개발 미리보기에서 `q=u` → DNS 태그 클릭 후 `q=u&tag=DNS`와 결과 1건 유지, 태그 해제 후 검색어 유지까지 재확인했다. 브라우저 실행 오류는 없었다.

## 2026-10-06 — Coding 회색 디자인·DNS 개발 미리보기

- 기존 Coding 시안을 밝은 회색·차콜 색상과 `| Coding` 표기로 다듬었다. 검색창 옆 큰 분류 제목은 메인 홈페이지 `/`로 연결한다.
- 최종 `npm run check` 통과: ESLint, TypeScript, 단위 검사 19개, Prisma 스키마 검사. Coding 검사 10개는 개발 예시의 명시적 활성화와 운영 환경 차단도 포함한다.
- 최종 `npm run build`와 `npm run test:smoke`의 HTTP 검사 58개 통과. `CODING_PREVIEW=1`인 운영 실행에서도 빈 자료 목록을 유지하며 예시를 공개하지 않는 것을 확인했다. HTTP 검사는 브랜드 표기와 분류 제목의 루트 링크도 검증한다.
- `NODE_ENV=development`, `CODING_PREVIEW=1`인 실제 개발 서버에서 Ubuntu·Rocky·DNS 예시를 확인했다. SERVER-INFRA 두 카드, Ubuntu 검색 1건, 없는 검색어 0건, 검색어 지우기의 분류 유지, FRONT-END의 자료 없음, 큰 분류 제목 → 루트 → Coding 복귀를 브라우저에서 실행했다.
- 예시 상세의 개요 → DNS 패키지 설치 → 설정 확인, 첫·중간·마지막 목차의 링크와 코드 블록을 확인했다. 카드와 상세에 ‘예시 자료’를 표시하고 임의 예시 날짜는 표시하지 않는다.
- 1440px 분류 목록, 768px 빈 분류, 390px 글 상세, 320px 홈에서 본문 가로 넘침이 없었다. 작은 화면의 최근 카드 2열, 아이콘·글자 간격, 모바일 본문·코드 블록을 시각적으로 확인했다. 실행 오류는 없었고, 기존 전역 `scroll-behavior: smooth`에 대한 Next.js 개발 경고가 관찰됐다.
- 예시는 개발 환경의 명시적 설정으로만 불러온다. DB 오류 시 예시로 대체하거나 운영 DB에 시드하지 않는다. DB 조회와 운영 배포는 구현 범위에 포함하지 않는다.

## 2026-10-06 — Coding 시안 구현

기준: `feature/web`의 `c3c2f9c6`. 작업 브랜치: `codex/coding-design`. Windows의 로컬 checkout에서 Node 24.19.0과 잠금 파일의 의존성으로 검증했다.

- 최종 수정본의 `npm run check` 통과: ESLint, TypeScript, 단위 검사 16개, Prisma 스키마 검사. 추가된 Coding 검사 7개는 분류·검색 입력 정규화·빈 데이터·필터 범위·본문/코드 검색·최신 정렬·URL 인코딩을 확인한다.
- `npm run build` 통과. 독립 실행 산출물의 `npm run test:smoke` HTTP 검사 58개 통과. 기존 루트·게임·사진·준비 중 화면, 사이트맵·메타데이터·닫힌 작성 API 검사도 포함한다.
- 홈과 4개 분류의 자료 없음, 검색어 및 분류 유지, 분류를 유지하는 검색어 지우기, 현재 메뉴 표시, HTML 이스케이프, 실제 DNS 예시 글이 없음을 확인했다. 없는 글 주소는 자료 없음 안내와 HTTP 404를 반환한다.
- 로컬 프로덕션 서버를 브라우저에서 확인했다. 1440px 데스크톱, 768px 태블릿, 390px·320px 모바일에서 본문 가로 넘침이 없었다. 분류 선택 → DNS 검색 → 검색어 지우기, 없는 글 → 전체 기록 복귀를 직접 실행했다. 콘솔 오류·경고는 없었다.
- 저장소 밖의 임시 SSR 검증 서버에서 실제 Coding 컴포넌트와 스타일에 테스트 자료를 전달했다. 카드/최근 업데이트, 서버 분류에서 Ubuntu·Rocky만 표시, 글 내부 첫/중간/마지막 목차의 이전·다음, 코드 블록, 모바일 본문·코드의 영역 내 가로 스크롤을 확인했다. 검증용 자료·서버·경로는 앱 빌드와 공개 저장소 변경에 포함하지 않는다.
- 작은 글씨 대비와 모바일 본문 건너뛰기 여백을 보완했다. 기존 공통 스타일·게임/소개 페이지·패키지 잠금 파일·DB 스키마·Jenkins 설정은 변경하지 않았다.
- `getCodingPosts()`는 현재 빈 배열이다. DB 조회·실제 글 게시·운영 배포는 이번 검증의 범위가 아니다. Windows 제한 실행 환경에서 발생한 `tsx` 사용자 정보 조회 오류는 자동 승인된 환경 밖 재실행으로 해결했다.

## 2026-10-05 — feature/web 통합 검증

- 오늘 구현 커밋 `5bf7794`에 기존 `feature/web`의 `74af846`을 병합했다. 기존 `Design/undery-portfolio` 원본 시안과 이력을 보존했으며 충돌은 없었다.
- 통합 커밋 `3a30665`에서 `npm run check`, `npm run build`, `npm run test:smoke`를 다시 실행해 통과했다. 단위 검사 9개·HTTP 검사 53개가 통과했고 작업 트리와 공백 검사에 문제가 없었다.
- 반영 대상은 사용자 지정 GitHub `feature/web` 브랜치다. Jenkins 설정 및 운영 서비스는 변경하지 않았다.

## 2026-10-05 — VRChat 타이틀 사진·VALORANT 배너

- UNDERY 글자 내부 배경을 사용자 지정 노을 사진으로 바꿨다. 앞쪽 아바타와 여섯 장의 사진 목록은 유지했다. 새 사진과 배너 파일은 사용자 원본의 SHA-256 일치를 확인했다.
- Another Game의 임시 카드 세 개를 사용자 제공 세이지·VALORANT 배너로 교체했다. 높이는 화면 폭에 따라 64–184px이며 원본 비율을 유지한다. 클릭하면 `/game/valorant`로 이동하고 ‘준비 중’만 표시한다.
- `npm run check`, `npm run build`, `npm run test:smoke` 통과. 단위 검사 9개·HTTP 검사 53개 통과. 변경 파일 Prettier와 `git diff --check` 통과.
- 실제 브라우저에서 새 글자 배경, 배너 클릭과 목적지 화면을 확인했다. 데스크톱 배너 184px·390px 모바일 배너 64px, 이미지 로딩과 비율 유지, 가로 넘침 없음을 확인했다.

## 2026-10-05 — ALL 표기·이전 버튼

- 사진 페이지 태그 ‘전체’를 ALL로 변경했다. 왼쪽 맨 위에 화살표와 ‘이전’ 글자로 구성된 `/game/vrchat` 복귀 링크를 추가했고, 후속 요청으로 외곽선을 제거했다.
- PHOTO SVG의 글자 영역이 링크 클릭을 가로채지 않도록 포인터 입력을 받지 않게 했다. 키보드 초점 표시와 44px 터치 높이를 유지했다.
- `npm run check`, `npm run build`, `npm run test:smoke` 통과. 단위 검사 9개·HTTP 검사 52개 통과. 변경 파일 Prettier와 `git diff --check` 통과.
- 실제 브라우저에서 이전 → `/game/vrchat` → 사진 더 보기 → 사진 페이지 이동을 확인했다. World 선택 후 ALL로 6장 복귀 확인. 데스크톱·390px에서 외곽선 0px, 클릭 영역, 제목과의 간격 및 가로 넘침 없음을 확인했다.

## 2026-10-05 — PHOTO 가로폭·태그와 구분선 글꼴 조정

- 큰 PHOTO는 기존 높이를 유지하면서 좌우 2.5% 여백 사이의 가로폭을 채운다. SVG 텍스트 길이 조정으로 화면 크기에 따라 맞추며, h1의 접근 가능한 이름 PHOTO를 유지했다.
- 태그 버튼과 구분선 PHOTO를 `/game/vrchat` 섹션 제목과 동일한 Cormorant Garamond/Georgia/serif, 굵기 400으로 변경했다. 사진 페이지 직접 접속 시에도 로드되는 로컬 font-face를 선언했다.
- `npm run check`, `npm run build`, `npm run test:smoke` 및 변경 파일 Prettier·공백 검사 통과. 단위 검사 9개와 HTTP 검사 52개 통과.
- 실제 브라우저에서 Cormorant 로딩·적용 폰트와 PHOTO heading을 확인했다. 데스크톱과 390px에서 제목이 가로폭을 채우고 가로 넘침이 없으며 사진 세 열이 유지됨을 확인했다.

## 2026-10-05 — 사진 페이지 폰트 통일

- `/game/vrchat/photo`의 큰 PHOTO 제목을 `/game/vrchat`의 UNDERY와 동일한 Anton 400 및 자간 -0.027em으로 변경했다. 본문·필터의 Pretendard와 대체 글꼴도 동일하게 지정했다. 색상·크기·배치·필터 기능은 유지했다.
- `npm run check`, `npm run build`, `npm run test:smoke` 통과. 단위 검사 9개, HTTP 검사 52개 통과. 실제 브라우저에서 Anton 로딩, 적용 글꼴과 굵기, 데스크톱·390px 모바일의 가로 넘침 없음을 확인했다.

## 2026-10-05 — VRChat 사진 갤러리·월별 및 태그별 조회

- ‘사진 더 보기’를 `/game/vrchat/photo`로 연결하고, 사용자 시안의 흰색 PHOTO 제목·구분선과 노란색 그라데이션을 적용했다. 원본 사진 여섯 장을 가로 세 장씩 표시한다.
- 월과 World·Character·Photo·Video 태그를 AND 조건으로 필터링한다. 날짜를 추정하지 않아 기존 여섯 장은 미지정·Photo로 시작한다. 사진별 설정 객체에 실제 월을 입력하면 월 목록에 자동 반영된다.
- `npm run check`, `npm run build`, `npm run test:smoke` 통과. 단위 검사 9개(필터 관련 4개 포함), HTTP 검사 52개 통과. 새 경로 HTTP 200·canonical·사이트맵·원본 화면 링크와 기존 404/준비 중 경로를 검사했다. 변경 파일의 Prettier 및 `git diff --check` 통과.
- 실제 브라우저에서 ‘사진 더 보기’ 이동, 네 태그의 결과, 미지정 월과 Photo 태그의 조합, 전체 조회 복귀를 확인했다. 데스크톱과 390px 모바일에서 가로 세 장 배치·사진 로딩·가로 넘침 없음 확인. 제목 폭을 조정하고 최종 빌드로 재확인했다.
- 헤더·푸터, 추가 소개 문구, 새 사진이나 영상, 업로드 기능은 추가하지 않았다. 운영 배포는 수행하지 않았다.

## 2026-10-05 — Game 중앙 문구 제거·캐릭터 높이 정렬

- 사용자 요청으로 `SELECT ONE` 요소와 스타일을 제거했다. 두 캐릭터의 눈·얼굴 높이를 기준으로 VRChat 캐릭터의 세로 위치만 조정했다. 일반·대형 데스크톱과 세로형 태블릿에 각 위치를 적용한다.
- 실제 브라우저의 기본 데스크톱·1920×1080·768×1024에서 얼굴 정렬, 문구 제거 및 가로 넘침 없음을 확인했다. 390px 모바일의 기존 위아래 배치와 Discord 버튼을 확인했다.
- `npm run check`, `npm run build`, `npm run test:smoke` 통과. 단위 검사 5개와 HTTP 검사 51개 통과.

## 2026-10-05 — Game 선택 애니메이션·요청 문구와 버튼

- `/game`에서 호버한 영역의 대각선 경계를 넓히고 내용을 1.025배로 확대한다. 반대쪽은 0.975배 및 22% 음영으로 표시한다. 중앙 `SELECT ONE`, 하단 중앙 Discord 버튼을 추가했다. 사용자 답변에 따라 Discord 주소는 비워 두고 버튼을 비활성 상태로 표시한다.
- 실제 브라우저에서 좌우 호버의 경계·배율·음영과 기본 상태 복귀를 확인했다. 데스크톱, 768px, 390px 화면에서 가로 넘침 및 카드·Discord 버튼 겹침 없음 확인. 모바일에서는 버튼을 두 선택 화면 아래에 배치했다.
- 모션 축소 환경에서는 확대·축소와 경계 이동을 끄도록 설정했다. 헤더·푸터 및 요청하지 않은 문구는 추가하지 않았다.
- `npm run check`, `npm run build`, `npm run test:smoke` 통과. 기존 단위 검사 5개와 HTTP 검사 51개 통과.

## 2026-10-05 — 기존 VRChat 시안 적용·미제작 페이지 정리

- 사용자 지정 제작 완료 화면 `/`, `/game`, `/game/vrchat`, `/coding` 유지. `/coding` 본문은 기존 구현 그대로이며 메인의 Whoami 카드도 유지한다.
- `feature/web` 커밋 `74af846`의 `Design/undery-portfolio`를 `/game/vrchat`에 적용. 원본 여섯 사진과 아바타의 Git blob 일치를 확인했다. 사이트 푸터에는 요청된 공통 모노그램을 사용한다.
- `/whoami`, `/game/highlights`, 이전 `/game/gallery`, `/privacy`, `/admin`은 ‘준비 중’만 표시한다. 미등록 경로도 동일 문구를 표시하며 HTTP 404를 유지한다.
- `npm run check`: ESLint·TypeScript·기존 단위 검사 5개·Prisma 검사 통과. `npm run build` 및 `npm run test:smoke`의 51개 HTTP 검사 통과.
- 실제 브라우저에서 `/game`의 VRChat 선택 → 새 주소, 원본 여섯 사진 목록, 확대 창·다음 사진·키보드 이전 사진·Esc 닫기, 프로필 창과 사진으로 이동, SNS 준비 중 안내를 확인했다.
- 데스크톱 및 390px 모바일에서 VRChat 원본 구도와 가로 넘침 없음을 확인했다. Whoami·VALORANT 목적지·개인정보·관리자와 세 영역의 미등록 주소에서 본문 ‘준비 중’, 헤더·푸터·추가 조작 요소 없음 확인. Coding 기존 화면 유지 확인.
- 동적 404는 Next.js의 React 응답에 본문이 포함되므로 HTTP 검사는 상태와 페이로드를, 브라우저 검사는 실제 렌더링 결과를 확인했다. 실제 SNS 연결·새 콘텐츠·실명 공개 기능·원격 배포는 추가하지 않았다.

## 2026-10-05 — 게임 선택 화면 문구 제거

- `/game`의 헤더·푸터, 제목·안내·게임 로고 아래 설명 등 추가 문구와 장식을 제거했다. 화면에는 게임 로고·이미지와 시안의 네 문구만 남겼다. 공유 이미지의 임의 문구도 제거했다.
- `npm run check`, `npm run build`, `npm run test:smoke` 통과. 기존 단위 검사 5개 및 HTTP 검사 50개 통과.
- 실제 미리보기에서 데스크톱·390px 모바일의 헤더·푸터 부재, 가로 넘침 없음, 이미지 로딩을 확인했다. 두 선택 카드의 기존 목적지 이동을 확인했다.

## 2026-10-05 — 게임 선택 화면·사이트 로고 후속 수정

사용자의 대각선 시안에 따라 `/game`을 VALORANT·VRChat 선택 화면으로 변경하고, 사이트 모노그램을 공통 적용했다. 아래 루트 도안 검증 이후의 후속 변경이다.

- `npm run check`: ESLint, TypeScript, 기존 단위 검사 5개, Prisma 스키마 검사 통과.
- `npm run build`, `npm run test:smoke`: 독립 실행 빌드와 50개 HTTP 검사 통과. 두 게임 링크의 순서·경로·문구, 목적지 제목과 빈 상태, 게임 공유 이미지 검사 추가.
- Edge 320·390·768·1024·1440·1920px에서 이미지 로딩, 가로 넘침 없음, 좌우 및 모바일 위아래 순서 확인.
- 건너뛰기 링크·키보드 선택·초점 표시, 두 목적지 이동, 호버와 동작 줄이기 설정 확인. 브라우저 실행 오류 없음.
- 메인·Whoami·Coding·게임 하위 페이지의 헤더·푸터가 동일 원본 모노그램을 사용하고 파비콘이 `/icon.svg`인지 확인. 중앙 UNDERY h1 유지.
- 공식 게임 이미지와 기존 VRChat 아바타 원본의 출처는 `GAME-ASSETS.md`에 기록. 사용자 모노그램의 SHA-256 및 파비콘에 삽입된 PNG 바이트 일치 확인.
- 실제 영상·스토리 업로드, SNS 연결, 운영 배포는 수행하지 않았다. Nginx 실행 환경에 대한 이전 미검증 범위는 그대로다.

## 2026-10-05 — 루트 홈페이지 도안

기준 브랜치: `codex/foundation`의 `58a5ad3`. 작업 브랜치: `codex/undery-homepage`.
Windows의 별도 로컬 checkout에서 Node 24.19.0과 기존 잠금 파일로 확인했다. 운영 서비스나 DB에는 적용하지 않았다.

| 항목           | 결과                                                                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 정적·단위 검사 | `npm run check` 통과: ESLint, TypeScript, 기존 단위 검사 5개, Prisma 스키마 검사                                                                                           |
| 빌드           | `npm run build` 통과: Next.js 독립 실행 산출물 생성                                                                                                                        |
| 앱 HTTP 검사   | `npm run test:smoke`의 50개 HTTP 검사 통과. 루트 GET/HEAD 200, 세 목적지, canonical, 루트·영역별 사이트맵, 미지원 404, 닫힌 작성 API 확인                                  |
| 브라우저       | Edge에서 320·390·768·1440·1920px 확인. 가로 넘침 없음, 배경 `rgb(242, 193, 78)`, 단일 UNDERY h1, SNS·메일 버튼 5개 비활성                                                  |
| 상호작용       | 건너뛰기 링크·키보드 카드 초점, 세 목적지 이동, 연결하기 앵커, 동작 줄이기 설정, 루트 공유 이미지 HTTP 200 확인. 브라우저 실행 오류 없음                                   |
| 기존 화면      | 세 하위 영역 이동과 기존 아이보리 배경 확인. 영역 화면·공통 스타일 수정 없음                                                                                               |
| 프록시         | Nginx 설정안과 72개 요청 검사 코드를 갱신. JavaScript/Python 구문 및 공백 검사 통과. 로컬에 Nginx가 없어 실제 프록시 실행은 미검증                                         |
| 의존성         | 패키지 추가·잠금 파일 변경 없음. `npm audit --omit=dev` 0건. 전체 감사의 high 5개 항목은 기존 ESLint 개발 도구에서 하나의 `braces` 권고(GHSA-vfj7-8cjw-p6xm)가 전파된 결과 |

`scripts/validate-schema.mjs`는 Windows에서도 검사할 수 있도록 Prisma CLI를 현재 Node 실행 파일로 호출한다. 스키마나 DB 연결 동작은 바꾸지 않았다. 실제 SNS 주소, 메일 발송, 공개 배포는 이번 도안의 범위에 포함하지 않는다.

## 이전 기반 구현의 기록

**이전 구현의 기록:** 아래 결과는 `5ef99c9`의 기반 구현과 2026-09-26 경로 정책에 대한 증거다. 2026-09-27 [계획 수정 2](PLAN-REVISION-2.md)의 루트 안내 200과 사용자 디자인 반영은 아직 검증하지 않았다. 기존 루트 404 검사 통과를 새 계획의 완료 증거로 사용하지 않는다. 이번 변경은 문서·작업 지침만 수정했다.

검증일: 2026-09-27. 요구사항 원본: `5d233a5`.
운영 설정을 바꾸지 않은 별도 checkout과 로컬 시험 환경에서 확인했다.

| 항목         | 결과                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| 정적 검사    | ESLint, TypeScript, Prettier 통과                                                                                       |
| 단위 검사    | 5개 통과: 비공개/초안 제외, MBTI 선택 공개, 외부 근거 링크, 영역 경계, 닉네임/댓글 길이·Unicode                         |
| Prisma       | 스키마 검사, client 생성, 최초 SQL migration 생성 통과                                                                  |
| DB 적용      | 임시 PostgreSQL 16.15의 빈 시험 DB에 migration 적용 및 최신 상태 확인                                                   |
| DB 제약      | 동시 공개 프로필 2개 거절, 개인정보 최초 비공개, 삭제 댓글 내용·해시 유지 거절, 내용 제거 후 삭제 성공                  |
| 앱 HTTP 검사 | 50개 통과. 루트/우회/미지원 404, 공개 경로 200, canonical·사이트맵·공유 이미지, 후행 슬래시, 작성 API 거절, health 상태 |
| 프록시 검사  | 임시 Nginx에서 52개 통과. HTTP/HTTPS·apex/www의 루트 404, 정상 영역 경로·쿼리 보존 308                                  |
| 의존성       | `npm audit`: 보고된 취약점 0건                                                                                          |
| Compose      | `docker compose config --quiet` 통과                                                                                    |
| 브라우저     | 데스크톱 화면, 모바일 320/390px, 검색·빈 결과, 게임 하이라이트 이동, 영역별 오류 복귀, 댓글 비활성 확인                 |

## 측정

첫 프로덕션 빌드: 29.83초. `/usr/bin/time -v`의 최대 RSS 607,800KB(약 594MiB), 스왑 0. 빌드 worker 2개, Node heap 상한 1,536MB를 사용했다. 이 값은 측정 프로세스의 최대 RSS이며 OS 전체 또는 동시 프로세스 메모리 합계가 아니다.

최초 점검 시 서버 메모리 가용 약 3.3GB, 저장 공간 가용 약 194GB. 빌드가 진행된 점검 구간에 기존 `https://undery.link`는 HTTP 200, 약 0.086초 응답을 보였다. 지속 부하·24시간 가용성·실서비스 DB 병행 시험은 아직 수행하지 않았다.

## 검증의 범위와 한계

- Nginx 검사는 저장소의 설정안을 임시 인증서와 높은 로컬 포트로 치환해서 실행했다. 운영 Nginx 파일과 서비스를 변경하지 않았다. 실제 공유기 외부망의 각 경로 검사는 운영 전환 후 별도로 필요하다.
- PostgreSQL은 Ubuntu 공식 패키지에서 추출한 바이너리로 임시 클러스터를 구성했다. 시험 fixture는 트랜잭션을 되돌렸고 서버를 종료했다. Compose의 PostgreSQL 17 컨테이너 실행·운영 migration·백업 복원은 아직 검증하지 않았다.
- Docker daemon 권한이 없어 이미지 빌드는 실행하지 않았다. Dockerfile이 사용하는 Next standalone 산출물은 직접 실행해 HTTP 검증했다.
- Jenkinsfile은 검증 단계만 준비했다. Jenkins 실작업 설정, GHCR 발행, 자동 운영 배포, 실패 복구·재부팅 복구는 미완료다.
- 관리자 OAuth, DB 읽기/쓰기, 실제 댓글, AWS 업로드, SNS 삽입은 아직 동작하지 않는다. UI·health·구현 현황에 준비 상태를 명시했다.
- 계획의 3단계 전체 완료가 아니라, 이후 인증·콘텐츠·배포 구현의 첫 기반이다.

## 재검증

```sh
npm ci
npm run check
npm run format:check
npm run build
npm run test:smoke
# 별도 터미널에서 PORT=3100 npm start 후:
python3 tests/proxy.py
# 초기 migration을 적용한 별도 *_test DB에서:
psql "$DATABASE_URL" -f tests/database.sql
```
