import type { APIRoute } from 'astro';
import { networkConfig } from '../../lib/network.ts';
import { GatewayClient } from '../../mcp/gateway.ts';

export const prerender = false;
export const GET: APIRoute = async ({ request }) => {
  const config = networkConfig();
  if (!config.gatewayUrl) return new Response('This network is not available yet.', { status: 503, headers: { 'cache-control': 'no-store' } });
  try {
    const { body } = await new GatewayClient(config, request.signal).call('/.well-known/mcp.json');
    return Response.json({ ...body, transport: { type: 'streamable-http', url: `${config.siteUrl}/mcp` },
      skills: Object.fromEntries(['setup', 'buy', 'orders', 'wallets', 'recipe', 'installable'].map(topic =>
        [topic, `${config.siteUrl}/skills/${topic === 'installable' ? 'SKILL' : topic}.md`])),
    }, { headers: { 'cache-control': 'public, max-age=30', 'access-control-allow-origin': '*' } });
  } catch {
    return Response.json({ error: { code: 'GATEWAY_UNAVAILABLE', message: 'Gateway metadata is unavailable for this network.' } },
      { status: 503, headers: { 'cache-control': 'no-store' } });
  }
};
