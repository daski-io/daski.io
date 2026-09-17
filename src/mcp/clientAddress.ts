import { isIP } from 'node:net';

/** Count trusted hops from the socket, never trust a caller-prepended address. */
export function mcpClientAddress(socketAddress: string, forwardedFor: string | null, trustedHops: number): string {
  if (!trustedHops || !forwardedFor) return socketAddress;
  const chain = [...forwardedFor.split(',').map(value => value.trim()), socketAddress];
  const candidate = chain[Math.max(0, chain.length - 1 - trustedHops)];
  return candidate && isIP(candidate) ? candidate : socketAddress;
}
