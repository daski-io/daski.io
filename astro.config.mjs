import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  redirects: {
    '/MarketplaceProtocolWhitePaper.pdf': {
      status: 301,
      destination: '/agentic-procurement-protocol-whitepaper.pdf',
    },
  },
  server: {
    host: true,
    port: Number(process.env.PORT) || 4321,
  },
  // Since Astro 7.4 a request's Host is trusted only when it matches one of
  // these; any other reads as localhost, which the MCP endpoint's host check
  // refuses. The two published sites (served behind a TLS-terminating proxy,
  // so no protocol is pinned here) and local runs and checks.
  security: {
    allowedDomains: [
      { hostname: 'daski.io' },
      { hostname: 'sandbox.daski.io' },
      { hostname: 'localhost' },
      { hostname: '127.0.0.1' },
    ],
  },
});
