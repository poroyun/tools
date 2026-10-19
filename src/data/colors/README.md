# 색상 도구 계산 정책

색상 수학은 표준 sRGB의 감마 인코딩된 0~255 채널에 대한 HSL/HSV 변환입니다.
선형광 보간, Display P3, 색상 프로파일 변환, CMYK는 다루지 않습니다.
참고 표준: https://www.w3.org/TR/css-color-4/#the-hsl-notation

- HEX는 `#RGB`, `#RRGGBB`, `#RRGGBBAA`를 허용하며 대소문자를 구분하지 않습니다.
- 내부 RGB·Alpha는 JavaScript number 정밀도로 유지합니다. HSL을 입력할 때는 정확한 HSL 원본도 유지합니다.
- UI의 숫자 입력 문자열은 상태와 분리합니다. 비어 있거나 유효하지 않은 값은 상태를 변경하지 않습니다.
- 하나의 필드 수정 시 해당 채널만 적용합니다. 다른 입력에 표시한 반올림 값을 다시 읽어 상태에 적용하지 않습니다.
- RGB 출력은 가장 가까운 8비트 정수, HEX8의 Alpha는 `round(alpha * 255)`를 사용합니다.
- HSL/HSV는 최대 소수점 2자리, Alpha와 상세 입력 표시는 최대 4자리입니다. 불필요한 0은 제거합니다.
- Hue는 0~360 입력을 받고 360을 0으로 정규화합니다. 순수 변환 함수는 음수·360 초과의 유한 Hue도 순환 처리합니다.
- 무채색의 계산 Hue는 0입니다. HSL 조정 중 무채색·검정·흰색이 되어도 입력한 HSL은 보존됩니다.
- 기본 팔레트는 불투명 색상으로 선택합니다. SV·Hue 조정과 스포이드는 현재 Alpha를 유지합니다.
- HEX/RGB/HSL은 Alpha를 포함하지 않으며, HEX8/RGBA/HSLA만 포함합니다. HSV는 CSS 함수가 아닙니다.

EyeDropper는 API 지원 + secure context일 때만 노출합니다. 클릭에서 직접 `open()`을 호출하며
취소(AbortError)는 오류로 표시하지 않습니다. 권한 요청·보안 제한은 브라우저에 맡기며 우회하지 않습니다.
API 명세: https://wicg.github.io/eyedropper-api/

팔레트 20개는 Tools에서 직접 구성한 기본 색상입니다. 참고 사이트의 디자인이나 에셋을 사용하지 않습니다.
