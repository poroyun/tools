# HTML 엔티티 데이터

- 원본: https://html.spec.whatwg.org/entities.json
- 표준 표: https://html.spec.whatwg.org/multipage/named-characters.html
- 고정 스냅샷 날짜: 2026-10-15 (Living Standard이므로 숫자 버전 대신 날짜와 SHA-256을 보관)
- 영문 문자 이름: https://www.unicode.org/Public/17.0.0/ucd/UnicodeData.txt
- 한국어: `scripts/data-sources/entities/korean.json`의 Tools 직접 보완 자료 (공식 번역 아님)

Copyright © WHATWG (Apple, Google, Mozilla, Microsoft).
WHATWG 저작물은 CC BY 4.0, 소스 코드에 포함되는 부분은 BSD 3-Clause가 적용됩니다.
전체 고지는 `scripts/data-sources/entities/WHATWG-LICENSE.txt`에 보관합니다.
배포 시 `/entities/licenses.txt` 정적 파일로 WHATWG·Unicode 고지 전문도 함께 제공합니다.
https://creativecommons.org/licenses/by/4.0/
https://github.com/whatwg/html/blob/main/LICENSE

Unicode 이름 데이터는 Unicode License v3(Unicode-3.0)를 따릅니다.
원본의 저작권·허가 고지는 기존 `scripts/data-sources/UNICODE-LICENSE.txt`와
https://www.unicode.org/license.txt 를 참고하세요.

Tools의 변경: 같은 코드포인트 시퀀스별 그룹화, 숫자 참조 생성, 한국어 메타데이터·분류 추가.
같은 문자의 모든 세미콜론 포함 별칭을 한 행에서 제공합니다. 원본 이름의 대소문자는 보존합니다.
세미콜론 없는 레거시 이름 106개는 중복과 모호성을 피하기 위해 UI에서 제외합니다.
검색만 대소문자를 무시하며, 복사한 이름을 실제 HTML에서 임의로 소문자화하면 안 됩니다.

UTF-16 code unit이 아닌 Unicode codepoint별로 Decimal/Hex 참조를 생성하고,
다중 코드포인트는 원본 순서로 참조를 이어 붙입니다. 정규화나 문자 병합을 하지 않습니다.
숫자 참조에 전용 named entity를 임의로 부여하지 않습니다.

`npm run generate:entities`로 보관된 원본만 사용해 오프라인 재생성할 수 있습니다.
생성 메타데이터의 SHA-256은 LF로 정규화한 UTF-8 텍스트 기준이므로 Git의 CRLF 체크아웃과 무관합니다.
데이터 업데이트 시 스냅샷 파일명·날짜·해시·출처·테스트를 함께 갱신하세요.
