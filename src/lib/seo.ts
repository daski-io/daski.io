import type { NetworkConfig } from './network.ts';
import { siteName } from './chains.ts';
import { providerPath, servicePath, type PublicService } from './api.ts';

export const SOCIAL_IMAGE = {
  path: '/assets/social/daski-card.png',
  width: 1200,
  height: 630,
  alt: 'Daski. The economy, open to agents. A curated procurement marketplace for AI agents. Discover. Evaluate. Buy. Manage.',
} as const;

export const PAGE_METADATA = {
  '/agents': {
    title: 'Connect your AI agent',
    description: 'Connect an MCP-compatible AI agent to Daski. Set up a wallet and use the buyer guide to discover and buy real services with USDC on Base.',
  },
  '/providers': {
    title: 'Sell services to AI agents',
    description: 'Bring your service to Daski’s curated marketplace for AI agents. Start with the provider integration tools, test on Testnet, and apply for review.',
  },
  '/activity': {
    title: 'Marketplace activity',
    description: 'Explore agent purchases, marketplace totals, provider reputation, and settlement contracts on Daski.',
  },
  '/proof': {
    title: 'Company registration by an AI agent',
    description: 'See the recording of an agent buying Daski’s company registration, the Base settlement transaction, and the resulting Wyoming corporation filing.',
  },
  '/brand-assets': {
    title: 'Brand assets and logos',
    description: 'Download Daski logos and letter marks in SVG and transparent PNG formats. Find brand colors and versions for light and dark backgrounds.',
  },
  '/terms-of-use': {
    title: 'Terms of use',
    description: 'Read Daski’s terms for the marketplace, APIs, and agent interfaces, including operator responsibilities, payments, provider services, and support.',
    canonicalUrl: 'https://daski.io/terms-of-use',
  },
  '/privacy-policy': {
    title: 'Privacy policy',
    description: 'Learn how Daski processes personal data across its marketplace, APIs, and agent interfaces, including data sharing, retention, and your rights.',
    canonicalUrl: 'https://daski.io/privacy-policy',
  },
} as const;

export function homeDescription(network: Pick<NetworkConfig, 'id' | 'gatewayUrl'>): string {
  if (network.id === 'testnet') {
    return 'Explore Daski’s testnet procurement marketplace for AI agents. Try service discovery, purchasing, and fulfillment with test USDC on Base Sepolia.';
  }
  if (!network.gatewayUrl) {
    return 'Explore Daski, a curated procurement marketplace for AI agents. Mainnet purchasing is not available yet; try the testnet sandbox.';
  }
  return 'Daski is a curated procurement marketplace for AI agents. Discover, evaluate, buy, and manage domains, mailboxes, and company formation services.';
}

export function pageTitle(title: string, network: Pick<NetworkConfig, 'id' | 'label'>): string {
  return `${title} · ${siteName(network)}`;
}

/** Catalog descriptions can contain long paragraphs; preserve a readable excerpt. */
export function descriptionExcerpt(value: string, maximum = 160): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= maximum) return clean;
  const excerpt = clean.slice(0, maximum - 1);
  const boundary = excerpt.lastIndexOf(' ');
  return `${(boundary > maximum / 2 ? excerpt.slice(0, boundary) : excerpt).trimEnd()}…`;
}

export function canonicalPageUrl(pathname: string, siteUrl: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  // Resolve only a path under the configured origin, never a request Host header.
  const url = new URL(siteUrl);
  url.pathname = `/${path.replace(/^\/+/, '')}`;
  return url.href;
}

export function sitemapXml(network: Pick<NetworkConfig, 'siteUrl' | 'robots'>, services: PublicService[]): string {
  const urls = new Set<string>();
  if (network.robots === 'index') {
    urls.add(canonicalPageUrl('/', network.siteUrl));
    for (const [path, metadata] of Object.entries(PAGE_METADATA)) {
      const url = 'canonicalUrl' in metadata ? metadata.canonicalUrl : canonicalPageUrl(path, network.siteUrl);
      // Legal documents retain their established production canonical URLs.
      if (new URL(url).origin === network.siteUrl) urls.add(url);
    }
    urls.add(canonicalPageUrl('/agentic-procurement-protocol-whitepaper.pdf', network.siteUrl));
    for (const service of services) {
      urls.add(canonicalPageUrl(servicePath(service), network.siteUrl));
      urls.add(canonicalPageUrl(providerPath(service), network.siteUrl));
    }
  }
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].map(url => `  <url><loc>${escape(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
}
