# 기반 구현 검증 기록

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
