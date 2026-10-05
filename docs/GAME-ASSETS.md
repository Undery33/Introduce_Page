# Game 화면 이미지 출처

사용자가 제공한 좌측 VALORANT·우측 VRChat 시안에 맞춰 아래 원본을 사용한다. 원본 이미지는 수정하지 않았으며, 화면의 크기와 위치는 CSS로 조정한다. 게임 로고는 사용자의 요청에 따라 공식 마크를 유지한다.

| 파일                                   | 출처와 원본                                                                                                                                                                                                                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/images/game/jett.png`          | [Riot Developer Portal의 Public Content Catalog](https://developer.riotgames.com/docs/valorant#assets). [공식 ZIP](https://valorant.dyn.riotcdn.net/x/content-catalog/PublicContentCatalog-release-08.09.zip)의 `Characters/ADD6443A-41BD-E414-F6AD-E58D267F4E95_full.png`. 2048×1860 RGBA PNG. |
| `public/images/game/valorant-logo.png` | [VALORANT 공식 Media 페이지](https://playvalorant.com/en-us/media/)의 Logos. [공식 ZIP](https://cmsassets.rgpub.io/sanity/files/dsfx7636/news/b17ccca742efd7261229bd030ca5b67df217516a.zip)의 `Full Color/Type_Lockup/V_Lockup_Vertical_Red.png`. 4001×2251 RGBA PNG.                           |
| `public/images/game/vrchat-logo.svg`   | [VRChat 공식 Press 페이지](https://hello.vrchat.com/press)에서 연결한 Press Kit의 [VRChat Logo Black.svg](https://drive.google.com/file/d/1cFZ5AFkMBX_vwPk4MXPXNtOU1XDaS9Hm/view). 원본 viewBox `0 0 1200 600`.                                                                                 |
| `public/images/game/vrchat-avatar.png` | 저장소 `feature/web` 브랜치의 커밋 `74af846`, `Design/undery-portfolio/dist/assets/photos/hero-cutout.png`를 그대로 복사. 기존 사용자 아바타 사진의 배경 제거 원본.                                                                                                                             |
| `public/images/brand/undery-mark.png`  | 사용자가 후속 메시지에 첨부한 UNDERY 브랜드 PNG 원본. 원래 투명도를 유지하며, 화면의 짙은 단색 표현만 CSS filter로 적용.                                                                                                                                                                        |

공식 자료 확인일: 2026-10-05. 게임 이미지와 로고의 권리는 각 권리자에게 있다.

## VRChat 기존 시안 복원

`/game/vrchat`은 [feature/web의 기존 시안](https://github.com/Undery33/Introduce_Page/tree/74af846cf94902d989ae5a3c3662263f07152d03/Design/undery-portfolio)을 Next.js 페이지로 옮긴다. 문구·레이아웃·사진은 해당 시안에 있는 것을 사용하며 사이트 푸터 로고만 후속 사용자 지시에 따라 제공된 모노그램으로 통일한다.

- `public/images/vrchat/`의 여섯 PNG는 기존 `dist/assets/photos/`에 있는 동일 이름 파일 원본이다. 사진 확대·8K 원본 저장에 사용한다.
- 메인 아바타는 이미 복사한 `public/images/game/vrchat-avatar.png`를 재사용한다.
- `public/fonts/CormorantGaramond-Variable.ttf`와 `public/licenses/CormorantGaramond-OFL.txt`도 같은 시안의 원본이다. Anton과 Pretendard는 기존 공통 파일을 재사용한다.
- 원본 시안의 출처 문서는 동일 Git 커밋의 `IMAGE-SOURCES.md`, `FONTS.md`에 있다. 시안에 들어 있던 예시 이름·문구를 새 개인정보로 추정하여 바꾸지 않는다.

## Another Game 배너

- `public/images/vrchat/valorant-banner.png`: 사용자가 2026-10-05에 첨부한 세이지·VALORANT 가로 배너 PNG 원본(971×234)을 그대로 복사했다.
- SHA-256: `e98b37e0e9a96b1657aa3ed4eda566e5b48b588ad169020b500d6bc094f0a120`.
- PNG 원본을 편집하지 않고 기존 VRChat 페이지와 어울리도록 표시할 때만 CSS 채도 0.88을 적용한다. 원본 비율을 유지하며 잘라내지 않는다.

## UNDERY 제목 내부 사진

- `public/images/vrchat/undery-title-sunset.png`: 사용자가 같은 날 첫 번째 사진으로 지정한 VRChat 스크린샷 원본(2560×1440)을 그대로 복사했다.
- SHA-256: `774a7d28419cfcfd654606706346f2bb5d84859610d2d1b11f575e68af934fc9`.
- 기존 `.hero-title`의 글자 내부 배경 이미지로 적용한다. 앞쪽 아바타와 사진 목록에는 사용하지 않는다.
