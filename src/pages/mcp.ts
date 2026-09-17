import type { APIRoute } from 'astro';
import { networkConfig } from '../lib/network.ts';
import { readLocalGuide } from '../lib/agentGuideRoute.ts';
import { mcpClientAddress } from '../mcp/clientAddress.ts';
import { createWebsiteMcp } from '../mcp/server.ts';

export const prerender = false;
let server: ReturnType<typeof createWebsiteMcp> | undefined;
export const ALL: APIRoute = ({ request, clientAddress }) => {
  const config = networkConfig();
  server ??= createWebsiteMcp(config, readLocalGuide);
  return server.fetch(request, mcpClientAddress(clientAddress, request.headers.get('x-forwarded-for'), config.mcpTrustProxy));
};
