# Unicode 이모지 데이터

- 원본: https://www.unicode.org/Public/17.0.0/emoji/emoji-test.txt
- 고정 버전: Unicode Emoji 17.0
- 한국어: Unicode CLDR release-48의 `common/annotations/ko.xml`, `common/annotationsDerived/ko.xml`
- 라이선스: Unicode License v3 (SPDX: Unicode-3.0)
- 저작권·허가 고지: `scripts/data-sources/UNICODE-LICENSE.txt` 및 보관한 원본 파일

원본 파일은 `scripts/data-sources/`에 보관합니다. `npm run generate:emoji`로 네트워크 없이
`generated.json`을 재생성합니다. 결과 메타데이터에 버전, 원본 URL, SHA-256 및 커버리지를 기록합니다.
새 버전으로 변경할 때는 원본, 생성 스크립트, 출처 문서, 화면 안내와 테스트를 함께 갱신하세요.

`fully-qualified`만 수록합니다. 구성 요소 단독, minimally-qualified와 unqualified 중복 표현은 제외합니다.
ZWJ, 국기, variation selector를 포함한 실제 코드포인트 시퀀스를 보존합니다.

피부색을 제거한 정확한 기본 시퀀스가 원본에 존재하는 경우에만 변형으로 묶습니다.
성별은 같은 subgroup의 명시적 ZWJ 성별 접미사 또는 단일 man/woman → person의
실제 중립 시퀀스가 있는 경우만 연결합니다. 가족·여러 인물의 성별 관계를 추측하지 않습니다.
기본 코드포인트 시퀀스가 다른 다중 인물 조합은 공식 이름에서 피부색 한정어를 제거한 이름과
subgroup이 정확히 일치하는 실제 기본 항목에만 연결합니다. 성별 조합을 추측하거나 새 문자를 만들지 않습니다.
명시적으로 연결할 수 없는 성별 관계는 독립 항목으로 남깁니다.
`kiss: person, person`와 `couple with heart: person, person`는 피부색 없는 ZWJ 기본형이
fully-qualified 목록에 없으므로, 별칭 2개를 명시적으로 관리해 기존 💏와 💑에 연결합니다.
참조: https://www.unicode.org/emoji/charts-17.0/full-emoji-modifiers.html
별칭은 `scripts/data-sources/variant-aliases.json`에 있으며 해시와 테스트 대상입니다.
변형 선택창에는 원본에 존재하는 문자만 제공하며 피부색·성별 조합을 임의로 생성하지 않습니다.

CLDR 이름/키워드는 생성 데이터에, Tools의 추가 검색 표현은 `supplemental.ts`에 구분합니다.
한국어 카테고리명은 Tools가 번역한 표시 이름입니다. CLDR 이름의 직접 일치만 수록하며
locale fallback이나 CLDR 패턴 확장은 적용하지 않습니다.

현재 Unicode latest 파일은 18.0을 표시하지만 이 프로젝트는 17.0으로 고정하므로 18.0 추가 문자를
지원하지 않습니다. OS 폰트가 구버전이면 일부 17.0 문자도 올바르게 표시되지 않을 수 있습니다.
