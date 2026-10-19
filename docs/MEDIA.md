# 아이콘·본문 이미지·VRChat 사진 관리

2026-10-19 후속 구현. 관리자 로그인까지 확인한 `9378c630` 운영 버전 다음 변경이다. 이 문서의 신규 기능은 아래 배포를 완료한 뒤 사용할 수 있다. 현재 운영에 자동 반영됐다는 의미는 아니다.

## 사용 방법

| 기능                  | 사용 방법                                                                                                                                                                        | 기존 구현 여부                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 글의 사용자 아이콘    | 글 편집 → 아이콘 → **사용자 아이콘 추가** → 이름 입력 → PNG/JPEG/WebP 선택. 등록 후 자동 선택되며 다른 글의 선택 목록에도 남는다.                                                | 이번에 추가                                            |
| 챕터 이동             | **챕터 추가** → 챕터별 제목·본문 작성 → **저장 후 발행** → **공개 글 확인**. 공개 글 하단의 **다음/이전**으로 이동한다.                                                          | 기존 구현. 첫·중간·마지막 챕터 렌더링과 링크 검사 통과 |
| 본문 이미지           | 본문 입력 칸에 파일을 드래그하거나 **이미지 추가**로 선택한다. 클립보드의 이미지 붙여넣기도 지원한다. 이미지가 본문 사이에 표시되며 설명 수정과 제거가 가능하다.                 | 이번에 추가                                            |
| Markdown 원문         | **Markdown 원문**으로 전환해 주소·문법을 직접 편집한다. **이미지 포함 편집**으로 돌아오면 단독 줄의 이미지가 다시 표시된다. 코드 블록 안의 이미지 문법은 코드로 유지된다.        | 이번에 추가                                            |
| VRChat 사진 추가      | 관리자 홈 → **VRChat 사진 관리** → **사진 추가** → 파일 드래그/선택 → 제목·설명·월·태그 입력 → **초안 저장** 또는 **저장 후 공개**.                                              | 이번에 추가                                            |
| 기존 VRChat 사진 수정 | **VRChat 사진 관리**에서 기존 사진의 **편집** → 파일 교체·정보 수정 → **저장 후 공개**. 최초 여섯 장도 편집할 수 있다.                                                           | 이번에 추가                                            |
| 사진 순서·메인 노출   | **표시 순서**의 작은 숫자부터 나열한다. **VRChat 메인에도 표시**된 공개 사진 중 앞의 최대 여섯 장이 `/game/vrchat`에 표시된다. 전체 공개 사진은 `/game/vrchat/photo`에 표시된다. | 이번에 추가                                            |
| 사진 숨김             | **저장 후 공개 중지**. 공개 갤러리에서 숨기며 초안은 유지한다.                                                                                                                   | 이번에 추가                                            |

글·사진 모두 자동 저장하지 않는다. 이미지 업로드와 초안 저장은 별개다. 업로드 뒤 초안을 저장해야 본문이나 사진 항목에 연결된 상태가 보존된다. 공개된 글·사진을 수정해 **초안 저장**만 하면 기존 공개본은 유지된다. 새 파일을 선택한 것만으로 기존 공개 사진이 바뀌지 않는다.

챕터는 최대 40개다. 순서는 편집 화면의 **위로/아래로**로 바꾼다. 한 챕터만 있으면 이전·다음 버튼이 없다. 마지막 챕터에는 다음 버튼이 없다. 챕터 주소는 `/coding/<글주소>?section=<챕터ID>`다.

촬영 월은 확인된 값만 입력하며 비워둘 수 있다. 태그는 기존 World·Character·Photo·Video를 유지한다. 이번 업로드는 정지 이미지만 지원하며 Video 태그가 영상 업로드 기능을 뜻하지 않는다. VRChat의 프로필·친구·SNS 배경 사진 설정은 이번 갤러리 관리와 별개다.

## 이미지 저장 규칙

- 파일당 최대 20 MiB, 4천만 픽셀 이하의 PNG·JPEG·WebP 정지 이미지를 받는다. 한 번의 본문 드롭은 최대 10장이다. SVG·HTML·애니메이션은 받지 않는다.
- 서버에서 파일 시그니처와 디코딩을 확인한다. EXIF 방향을 적용한 후 최대 4096×4096 범위에 맞춰 WebP 품질 90으로 저장한다. 확대하지 않으며 EXIF/GPS 메타데이터를 제거한다. 새 업로드 원본 파일은 별도 보관하지 않는다. 원본은 개인 보관소에 유지한다.
- 파일명은 서버가 생성하는 임의 ID이며 원래 파일명·경로를 서버 파일 경로로 사용하지 않는다. 글·사진에서 제거해도 파일을 바로 삭제하지 않아 공유된 이미지와 수정 초안을 보호한다. 미사용 파일 정리는 별도 운영 작업이다.
- `MEDIA_DIRECTORY=/var/lib/undery-media`에 파일을 보관한다. 배포 release나 `public` 디렉터리에 저장하지 않는다. systemd `StateDirectory=undery-media`가 DynamicUser의 영구 쓰기 경로를 관리한다. Compose 앱에서는 별도 `media_data` 볼륨을 사용한다.
- `/media/<ID>.webp`는 앱이 제공한다. 관리자 세션이 있거나 공개 글·공개 사진의 현재 공개본에서 참조하는 파일만 읽을 수 있다. 응답은 `private, no-store`이며 업로드 이미지는 Next 이미지 최적화 캐시를 통하지 않는다. 초안 사진 URL을 안다고 파일을 읽을 수 있는 구조가 아니다.
- 이미 방문자가 다운로드한 공개 파일까지 회수할 수는 없다. 기존 저장소의 `/images/vrchat/...` 정적 원본은 원래 공개 자산이므로 갤러리에서 숨겨도 해당 정적 주소 자체는 남는다.

## 현재 서버에 적용

이번 배포 커밋: `690d44f69f21b0ef42518e9c14d9e35dca89a61a`. 최초 미디어 앱 커밋 `22c66a6a4b6569a8227bcb791373b861eb662204` 이후 인증 HTTP 검사의 아이콘 이름 fixture와 배포 전 포트 검사를 수정했다. 배포 manifest는 수정된 커밋의 앱·자산·검사·배포 도구 파일 158개를 확인한다.

이미 확인한 관리자 release에서 한 번 전환하는 절차다. `deploy/media-source.json`은 현재 release, 이전 Nginx/systemd 설정 해시, 새 앱 커밋과 소스 해시를 고정한다. 값이 다르면 덮어쓰지 않고 중단한다.

서버 root 터미널에서 현재 작업 디렉터리의 준비된 파일로 실행한다. `git pull`로 합성 로컬 이력을 원격 이력에 병합하지 않는다.

```sh
cd /home/undery/Documents/Codex/2026-10-19/github-introduce-page/work/Introduce_Page
python3 scripts/deploy-host-admin.py --manifest deploy/media-source.json --apply
```

기본 실행에서 `--apply`를 빼면 읽기 사전 검사만 수행한다. 실제 적용 순서:

1. 소스 해시 확인, Prisma client 생성, 배포 커밋으로 standalone 빌드, 기존 HTTP 검사.
2. 별도 `undery_test` DB에 migration 적용. 기존 글 DB 통합 검사와 새 인증 HTTP 검사를 실행한다. 새 검사는 로컬 3103 포트·별도 임시 사진 디렉터리·시험 DB의 임시 세션을 사용한다. 실제 GitHub 토큰이나 운영 브라우저 쿠키를 사용하지 않는다. 자체 생성 행·파일만 정리한다.
3. 운영 DB custom dump를 비공개 백업에 저장한다. 별도 DB에 복원하고 이번 migration을 먼저 적용한다. 복원·migration 성공 후 해당 임시 DB만 제거한다.
4. 운영 DB에 추가형 migration을 적용한다. `UploadedImage`, `CustomIcon`, `VrchatPhoto` 테이블을 추가하며 기존 글·초안·사진 원본을 초기화하거나 seed하지 않는다.
5. 후보 서버의 DB·인증·사진 저장소 상태 확인 후 Nginx 검사, StateDirectory 설정, release 전환과 웹 재시작을 수행한다. 이미지 API에만 20 MiB 요청을 허용하며 일반 관리 JSON은 기존 256 KiB 제한이다.
6. 내부 및 HTTPS 프록시 경유 health가 성공해야 완료된다. `/api/health`의 `checks.database`와 `checks.media`가 모두 `ok`인지 확인한다. 실패하면 기존 웹 release·설정을 복구하며 운영 DB와 사진 파일은 유지한다.

운영 경로 쓰기와 root 전용 설정 접근은 제한되어 실제 배포는 서버 root 터미널에서 실행한다. 배포 출력의 `PASS`, `배포 완료`, 오류 메시지로 서버 측 결과를 확인한다. 전체 비공개 로그·환경 파일·DB 덤프는 대화에 붙이지 않는다.

### 시험 포트 사용 불가로 중단된 경우

시험 서버 종료 직후에는 TCP 연결이 `TIME_WAIT`로 남을 수 있다. 최초 Python 포트 검사는 재사용 옵션 없이 bind해 이 상태에서도 실패할 수 있었다. 현재 검사는 Node 서버와 동일하게 `SO_REUSEADDR`를 설정한다. 실제 LISTEN 서버가 점유한 포트는 계속 거절한다. 프로세스 종료나 커널 TCP 설정 변경은 수행하지 않는다.

수정 뒤에도 중단되면 오류 코드가 함께 표시된다. `EADDRINUSE`일 때 root 터미널에서 `ss -antp '( sport = :3103 )'`로 LISTEN 프로세스와 TCP 상태를 확인한다. `EPERM` 또는 `EACCES`는 실행 환경의 소켓 권한 제한이다. 프로세스 용도를 확인하기 전에 `kill`, `fuser -k`로 종료하지 않는다. 이 오류는 배포 사전 검사에서 발생하므로 해당 실행의 운영 migration과 웹 전환은 시작되지 않는다.

근거: [Python SO_REUSEADDR / TIME_WAIT](https://docs.python.org/3/library/socket.html), [Node 24.20.0 net.Socket](https://nodejs.org/download/release/v24.20.0/docs/api/net.html).

### 아이콘 HTTP 검사 실패 후 재확인

최초 시험 코드의 `test-` + UUID는 41자여서 아이콘 이름 최대 40자 제한에 걸렸다. API가 HTTP 400을 반환한 것은 입력 규칙에 맞는 동작이다. 시험 이름을 `test` + UUID(40자)로 수정하고 41자 거절 검사도 추가했다. 해당 실패는 배포 1/5 단계이며 이 시도의 운영 migration과 웹 전환은 시작되지 않았다.

앞선 실행에서 시험 DB migration과 standalone 빌드를 마쳤으므로 서버 root 터미널에서 실패한 검사만 먼저 다시 실행할 수 있다. 이 명령은 시험 DB와 임시 이미지 디렉터리만 사용하며 웹 서비스를 재시작하지 않는다.

```sh
cd /home/undery/Documents/Codex/2026-10-19/github-introduce-page/work/Introduce_Page
/opt/personal-site/node-v24.20.0-linux-x64/bin/node --env-file=/etc/undery/test.env --import tsx --test --test-isolation=none tests/integration/media-http.test.ts
```

통과한 뒤 위의 `deploy-host-admin.py --manifest deploy/media-source.json --apply`로 배포한다. 배포 스크립트는 수정된 커밋으로 다시 빌드하고 전체 사전 검사를 수행한다. 검사 파일만 수동 수정하거나 manifest 검증을 건너뛰지 않는다.

전환 후 기존 편집 탭의 내용을 먼저 저장하고 새로고침한다. 사용자 아이콘과 본문 드래그 이미지, 사진 초안 재열기·공개·공개 중지를 브라우저에서 확인한다. 서버 측 HTTP 검사가 실제 마우스 드롭이나 한글 IME 조작을 대신 검증한 것은 아니다.

## 백업과 복구

DB 백업에 사진 바이너리는 포함되지 않는다. 운영 백업은 **DB dump와 `/var/lib/undery-media` 파일 사본을 함께** 보관한다. 현재 파일은 임의 이름으로 추가되고 자동 삭제되지 않으므로 DB dump를 먼저 완료한 뒤 미디어 디렉터리를 복사하면 dump가 참조하는 파일을 포함할 수 있다. 이 보관 순서는 향후 파일 정리 기능을 추가하면 다시 검토해야 한다. DynamicUser 환경의 실제 저장 경로는 `/var/lib/private/undery-media` 아래로 연결될 수 있다. 저장소 디렉터리는 root 권한으로 백업한다.

이번 배포는 첫 미디어 기능 적용 전 DB를 백업한다. 정기 사진 백업 작업과 외부 백업 보관은 아직 자동 설정하지 않았다. 이전 웹 release로 복구해도 새 DB 테이블과 미디어 디렉터리는 지우지 않는다. DB 전체를 과거 시점으로 복구할 때에는 대응하는 사진 파일 사본도 복원해야 한다.

## 구현 근거

- [MDN 파일 드래그 앤 드롭](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop)
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Sharp 입력 제한](https://sharp.pixelplumbing.com/api-constructor/) · [출력과 메타데이터 처리](https://sharp.pixelplumbing.com/api-output/)
- [systemd.exec — StateDirectory / DynamicUser](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec)
