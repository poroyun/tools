# Tools

Astro, TypeScript, SCSS 기반 웹 도구 사이트의 초기 개발 환경입니다.

## 실행

Node.js 22.12.0 이상이 필요합니다.

```sh
npm ci
npm run dev
```

개발 서버 기본 주소: http://localhost:4321

```sh
npm run check
npm run build
npm run preview
```

`check`는 Astro 및 TypeScript 진단, `build`는 `dist/` 정적 파일 생성,
`preview`는 빌드 결과의 로컬 확인에 사용합니다.

## 폴더

- `src/pages`: 페이지 라우트
- `src/components`: 재사용 컴포넌트
- `src/layouts`: 공통 페이지 레이아웃
- `src/styles`: SCSS 스타일
- `src/data`: 도구 데이터 (현재 비어 있음)
- `src/scripts`: Vanilla JavaScript / TypeScript (현재 비어 있음)

현재는 홈 페이지만 제공합니다. `/characters/`, SEO, AdSense 및 GitHub Pages 설정은 후속 작업입니다.
