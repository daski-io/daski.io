// The running instance's network, resolved once from the process environment.
//
// Server only: pages call networkConfig() in their frontmatter and pass
// networkView() into islands. Every variable has a default, so a service with
// none of them set is the Testnet sandbox site. A typo fails loudly here rather
// than quietly serving another network.
import {
  CHAINS,
  DEFAULT_TESTNET_GATEWAY_URL,
  NETWORK_IDS,
  type NetworkId,
  type NetworkNotice,
  type NetworkView,
} from './chains.ts';
import type { GatewayTarget } from './api.ts';

export type Robots = 'index' | 'noindex';

export interface NetworkConfig extends NetworkView {
  /** Server-only gateway origin over private networking; null when unset or when no gateway is configured. */
  gatewayInternalUrl: string | null;
  /** This instance's canonical origin. */
  siteUrl: string;
  robots: Robots;
}

export type ProcessEnv = Record<string, string | undefined>;

const NOTICES: readonly NetworkNotice[] = ['testnet', 'mainnet-soon', 'none'];
const ROBOTS: readonly Robots[] = ['index', 'noindex'];

function read(env: ProcessEnv, name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  name: string,
  fallback: T,
): T {
  if (value === undefined) return fallback;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`${name} must be one of ${allowed.join(', ')}, got "${value}"`);
}

function origin(value: string | undefined, name: string): string | undefined {
  if (value === undefined) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL, got "${value}"`);
  }
  if (
    (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
    parsed.username || parsed.password || parsed.search || parsed.hash ||
    parsed.pathname !== '/'
  ) {
    throw new Error(`${name} must be a bare origin (scheme and host only), got "${value}"`);
  }
  return parsed.origin;
}

export function resolveNetworkConfig(env: ProcessEnv): NetworkConfig {
  const id = oneOf(read(env, 'DASKI_NETWORK'), NETWORK_IDS, 'DASKI_NETWORK', 'testnet');
  const chain = CHAINS[id];
  const gatewayUrl = origin(read(env, 'GATEWAY_URL'), 'GATEWAY_URL')
    ?? (id === 'testnet' ? DEFAULT_TESTNET_GATEWAY_URL : null);
  const gatewayInternalUrl = gatewayUrl
    ? origin(read(env, 'GATEWAY_INTERNAL_URL'), 'GATEWAY_INTERNAL_URL') ?? null
    : null;
  const siteUrls: Record<NetworkId, string> = {
    testnet: origin(read(env, 'TESTNET_SITE_URL'), 'TESTNET_SITE_URL') ?? CHAINS.testnet.siteUrl,
    mainnet: origin(read(env, 'MAINNET_SITE_URL'), 'MAINNET_SITE_URL') ?? CHAINS.mainnet.siteUrl,
  };
  const siteUrl = origin(read(env, 'SITE_URL'), 'SITE_URL') ?? siteUrls[id];
  siteUrls[id] = siteUrl;
  const derivedNotice: NetworkNotice = id === 'testnet'
    ? 'testnet'
    : gatewayUrl ? 'none' : 'mainnet-soon';
  return {
    id,
    label: chain.label,
    chainId: chain.chainId,
    chainName: chain.chainName,
    explorerUrl: origin(read(env, 'EXPLORER_URL'), 'EXPLORER_URL') ?? chain.explorerUrl,
    gatewayUrl,
    gatewayInternalUrl,
    notice: oneOf(read(env, 'NETWORK_NOTICE'), NOTICES, 'NETWORK_NOTICE', derivedNotice),
    siteUrls,
    siteUrl,
    robots: oneOf(read(env, 'SITE_ROBOTS'), ROBOTS, 'SITE_ROBOTS', 'index'),
  };
}

let resolved: NetworkConfig | null = null;

export function networkConfig(): NetworkConfig {
  if (!resolved) {
    const env = (globalThis as { process?: { env?: ProcessEnv } }).process?.env ?? {};
    resolved = resolveNetworkConfig(env);
  }
  return resolved;
}

/** The serializable slice islands receive as props; the internal origin stays on the server. */
export function networkView(config: NetworkConfig): NetworkView {
  const { id, label, chainId, chainName, explorerUrl, gatewayUrl, notice, siteUrls } = config;
  return { id, label, chainId, chainName, explorerUrl, gatewayUrl, notice, siteUrls };
}

/** Where server-side fetches go, or null while this network has no gateway. */
export function gatewayTarget(config: NetworkConfig): GatewayTarget | null {
  return config.gatewayUrl
    ? { url: config.gatewayUrl, internalUrl: config.gatewayInternalUrl, chainId: config.chainId }
    : null;
}
