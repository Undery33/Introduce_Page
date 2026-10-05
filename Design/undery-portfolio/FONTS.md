# 사용한 실제 웹폰트

2026-09-26에 공식 배포 저장소와 라이선스를 인터넷에서 확인하고, 폰트 원본을 프로젝트에 포함했습니다. `index.html`에서 `fonts.css`를 불러오며 CSS의 `@font-face`로 적용합니다. 폰트를 이미지로 만들지 않았습니다.

| 용도 | 폰트 | 공식 배포 및 라이선스 |
| --- | --- | --- |
| 큰 UNDERY 제목 | Anton Regular | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/anton) · [SIL OFL 1.1](https://github.com/google/fonts/blob/main/ofl/anton/OFL.txt) |
| 영문 섹션 제목 | Cormorant Garamond Variable | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond) · [SIL OFL 1.1](https://github.com/google/fonts/blob/main/ofl/cormorantgaramond/OFL.txt) |
| 한국어 및 일반 본문 | Pretendard Variable v1.3.9 | [공식 저장소](https://github.com/orioncactus/pretendard) · [SIL OFL 1.1](https://github.com/orioncactus/pretendard/blob/v1.3.9/LICENSE) |

폰트 원본과 저작권/라이선스 전문은 `dist/assets/fonts/`에 함께 있습니다. 폰트를 수정하지 않았으며, 네트워크 없이도 페이지에 포함된 폰트를 불러옵니다. 사용하는 기기에 해당 글꼴이 설치되어 있을 필요가 없습니다.
