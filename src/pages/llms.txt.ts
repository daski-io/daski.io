import type { APIRoute } from 'astro';
import { llmsText } from '../lib/chains.ts';
import { networkConfig, networkView } from '../lib/network.ts';

export const prerender = false;
export const GET: APIRoute = () =>
  new Response(llmsText(networkView(networkConfig())), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
