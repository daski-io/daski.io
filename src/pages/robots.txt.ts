import type { APIRoute } from 'astro';
import { networkConfig } from '../lib/network.ts';

export const prerender = false;
export const GET: APIRoute = () => {
  const { robots } = networkConfig();
  const body = robots === 'noindex'
    ? 'User-agent: *\nDisallow: /\n'
    : 'User-agent: *\nAllow: /\n';
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
};
