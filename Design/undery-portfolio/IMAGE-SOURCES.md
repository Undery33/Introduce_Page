# 사용 이미지와 출처

모든 사진은 사용자가 지정한 [사진 화질 개선 공유 대화](https://chatgpt.com/share/6ab7d371-e6a0-83ee-b0ae-c12580181f80)에서 확인하고 내려받은 8K PNG 보정본을 기반으로 합니다.

| 사이트 파일 (`dist/assets/photos/`) | 공유 대화 파일 | 용도 |
| --- | --- | --- |
| sky-portrait.png | VRChat_sky_portrait_8K_technical_4320x7680.png | 세로 원본, 제목 안 이미지, 갤러리 |
| classroom-water.png | VRChat_classroom_water_8K_technical_7680x4320.png | 갤러리, 커뮤니티 및 게임 카드 |
| star-piano.png | VRChat_star_piano_8K_technical_7680x4320.png | 갤러리, 커뮤니티 및 게임 카드 |
| snow-street.png | VRChat_snow_street_8K_technical_7680x4320.png | 갤러리 |
| industrial-alley.png | VRChat_industrial_alley_8K_technical_7680x4320.png | 갤러리, 커뮤니티 및 게임 카드 |
| piano-night.png | VRChat_piano_night_8K_technical_7680x4320.png | 갤러리 |
| hero-cutout.png | sky-portrait.png만 참조한 배경 제거 편집 | 메인 캐릭터, 흐린 장식 레이어, 프로필 |

6장의 보정본은 파일 내용과 해상도를 변경하지 않았습니다. 원본과 배포 파일의 SHA-256을 비교하여 동일함을 확인했습니다. 파일별 해시는 `image-sources.json`에 기록합니다.

메인 캐릭터는 내장 image_gen 도구의 배경 제거 편집으로 제작했습니다. 새로운 캐릭터나 장면을 생성하지 않았습니다. 이 편집본은 941 × 1672이며, 8K 원본은 따로 유지합니다. 편집 프롬프트 전문은 `IMAGE-PROMPTS.md`를 참고하세요.

썸네일·카드·제목·원형 이미지에는 CSS의 화면 표시용 크롭을 사용합니다. 확대 창은 원본 비율과 전체 구도를 유지하고, 「8K 원본 저장」을 제공합니다. 원형 이미지는 해당 6장으로 구성한 예시이며 실제 친구들의 프로필 사진은 아닙니다.

기존에 생성했던 hero.png, memories.png, worlds.png는 현재 웹페이지와 배포 묶음에서 제외했습니다. 폰트와 단순 UI 아이콘은 사진 이미지와 별도로 유지합니다.
