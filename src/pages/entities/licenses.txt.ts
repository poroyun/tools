import type { APIRoute } from 'astro';
import whatwg from '../../../scripts/data-sources/entities/WHATWG-LICENSE.txt?raw';
import unicode from '../../../scripts/data-sources/UNICODE-LICENSE.txt?raw';

export const GET: APIRoute = () => new Response(`${whatwg}\n\nUnicode data notices:\n\n${unicode}`, {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
