import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

// Who the MCP client is, decided like the gateway's edge boundary.
//
// The website sits behind Cloudflare, which forwards to Railway's edge, which
// forwards to the container. Counting forwarding hops named a proxy as the
// client whenever the chain was longer than declared (the gateway found this
// on 2026-09-24: every caller shared one bucket keyed by a CDN hop's address),
// so the chain is not counted. Cloudflare adds a secret header to every
// request it forwards; an MCP request without it is refused, and the client
// is the address Cloudflare names in CF-Connecting-IP, which it always sets
// itself. Without a configured secret (a local run) the socket peer is all
// there is.
export const EDGE_SECRET_HEADER = 'x-daski-edge-secret';
export const EDGE_CLIENT_HEADER = 'cf-connecting-ip';

export type McpAdmission =
  | { admit: true; clientAddress: string }
  | { admit: false; status: number; message: string };

/** A bare address without brackets, zone or IPv4-mapped prefix, or "" when it is not one. */
export function normalizeAddress(value: string | null | undefined): string {
  let ip = (value ?? '').trim().replace(/^\[|\]$/g, '').split('%', 1)[0];
  if (ip.toLowerCase().startsWith('::ffff:') && isIP(ip.slice(7)) === 4) ip = ip.slice(7);
  return isIP(ip) ? ip : '';
}

export function mcpClientAdmission(request: {
  socketAddress: string | undefined;
  secretHeader: string | null;
  connectingIp: string | null;
}, edgeSecret: string | null, requireEdge: boolean): McpAdmission {
  if (!edgeSecret) {
    if (requireEdge) return { admit: false, status: 503, message: 'The MCP edge is not configured.' };
    return { admit: true, clientAddress: normalizeAddress(request.socketAddress) || 'unknown' };
  }
  const presented = Buffer.from(request.secretHeader ?? '');
  const expected = Buffer.from(edgeSecret);
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
    return { admit: false, status: 403, message: 'MCP requests reach the website only through its edge.' };
  }
  const client = normalizeAddress(request.connectingIp);
  if (!client) return { admit: false, status: 400, message: 'The edge did not name the client address.' };
  return { admit: true, clientAddress: client };
}
