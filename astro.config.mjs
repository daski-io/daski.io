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
});
