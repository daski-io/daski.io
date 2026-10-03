import type { APIRoute } from 'astro';
import { networkConfig } from '../lib/network.ts';
import { readLocalGuide } from '../lib/agentGuideRoute.ts';
import { EDGE_CLIENT_HEADER, EDGE_SECRET_HEADER, mcpClientAdmission } from '../mcp/clientAddress.ts';
import { createWebsiteMcp } from '../mcp/server.ts';

export const prerender = false;
let server: ReturnType<typeof createWebsiteMcp> | undefined;
export const ALL: APIRoute = ({ request, clientAddress }) => {
  const config = networkConfig();
  server ??= createWebsiteMcp(config, readLocalGuide);
  // Mainnet refuses MCP until its edge secret is configured; a local or
  // sandbox instance without one keys clients by the socket peer.
  const admission = mcpClientAdmission({
    socketAddress: clientAddress,
    secretHeader: request.headers.get(EDGE_SECRET_HEADER),
    connectingIp: request.headers.get(EDGE_CLIENT_HEADER),
  }, config.edgeSecret, config.id === 'mainnet');
  if (!admission.admit) {
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32000, message: admission.message } }), {
      status: admission.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
  return server.fetch(request, admission.clientAddress);
};
