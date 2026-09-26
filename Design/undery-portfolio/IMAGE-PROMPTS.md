# 원본 기반 이미지 편집

도구: OpenAI 내장 image_gen. 단 한 장의 지정된 원본을 참조하여 배경 제거 편집 1회.

입력: dist/assets/photos/sky-portrait.png (4320 × 7680, 공유 대화의 8K 보정본)

출력: dist/assets/photos/hero-cutout.png (941 × 1672, 투명 PNG)

배경 제거본은 웹페이지 배치용입니다. 원본의 캐릭터 외형과 자세를 유지하도록 편집했지만, 생성형 편집 특성상 원본과 픽셀 단위 동일성을 보장하지 않습니다. 갤러리에는 별도로 보관한 변경 없는 8K 원본을 사용합니다.

## 실제 편집 프롬프트

```text
Use case: background-extraction
Asset type: transparent PNG hero cutout extracted from the supplied original avatar screenshot.
Input image 1 is the EDIT TARGET and the sole source. Perform only background removal.
Primary request: remove only the blue sky and clouds behind the avatar and make all background areas genuinely transparent using a real alpha channel. Also remove the sky visible through the open center of the botanical halo crown and other genuine gaps between foreground elements. Preserve the original screenshot's portrait aspect ratio, subject scale, placement, and original crop.
Strict invariants: keep the original avatar and every foreground detail exactly as in the input image. Preserve the same face and identity, yellow bob hairstyle and every visible strand, amber eyes and expression, head angle, halo botanical crown and antler-like sides, headphones, cheek flower decorations, yellow dress, black and gold jacket, visible black tail, pose, hands, all outfit details and accessories, camera angle, colors, highlights, texture, and the original anime/VRChat screenshot rendering style. This is a precise cutout of the existing image, not a new rendering.
Do not redraw, beautify, retouch, recolor, restyle or reinterpret the character. Do not change facial features, body, expression, pose, framing or clothing. Do not invent parts beyond the original crop. No new objects, no text, no shadow backdrop, no checkerboard pattern. Output only the original foreground on genuine transparency, with clean natural edges preserving fine hair and crown details.

```
