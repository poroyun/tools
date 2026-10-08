import type { APIRoute } from 'astro';
import data from '../../data/emoji/generated.json';

// Astro 빌드 시 JSON 파일로 생성되어 GitHub Pages에서 정적으로 제공됩니다.
export const GET: APIRoute = () => new Response(JSON.stringify(data), {
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});
