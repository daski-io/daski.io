import manifest from '../../package.json' with { type: 'json' };
import type { NetworkConfig } from '../lib/network.ts';

/** One public identity for MCP discovery and the URL-readable manifest. */
export function mcpServerInfo(config: Pick<NetworkConfig, 'siteUrl'>) {
  return {
    name: 'daski',
    title: 'Daski',
    version: manifest.version,
    description: 'Discover, buy, and manage real-world business services, including domains, mailboxes, and company formation, through Daski.',
    websiteUrl: config.siteUrl,
    icons: [
      { src: `${config.siteUrl}/assets/brand/daski-mark-light.png`, mimeType: 'image/png', sizes: ['1024x1024'], theme: 'light' as const },
      { src: `${config.siteUrl}/assets/brand/daski-mark-dark.png`, mimeType: 'image/png', sizes: ['1024x1024'], theme: 'dark' as const },
    ],
  };
}
