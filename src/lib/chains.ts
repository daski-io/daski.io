// Chain facts and network-neutral presentation helpers.
//
// This module is imported by browser islands, so it never reads the process
// environment. The running instance's network is resolved on the server in
// network.ts and handed to islands as a serializable NetworkView.

export type NetworkId = 'testnet' | 'mainnet';
export type NetworkNotice = 'testnet' | 'mainnet-soon' | 'none';

export interface ChainFacts {
  chainId: number;
  chainName: string;
  /** The network slug the gateway reports in its chain metadata. */
  network: string;
  explorerUrl: string;
  label: string;
  /** The public host this network's site is served from by default. */
  siteUrl: string;
}

export const NETWORK_IDS: readonly NetworkId[] = ['testnet', 'mainnet'];

// Protocol constants shared with the gateway and the buyer CLI: the gateway
// accepts exactly these two chains, so a third network is a code change across
// the stack rather than a variable.
export const CHAINS: Readonly<Record<NetworkId, ChainFacts>> = {
  testnet: {
    chainId: 84532,
    chainName: 'Base Sepolia',
    network: 'base-sepolia',
    explorerUrl: 'https://sepolia.basescan.org',
    label: 'Testnet',
    siteUrl: 'https://sandbox.daski.io',
  },
  mainnet: {
    chainId: 8453,
    chainName: 'Base',
    network: 'base',
    explorerUrl: 'https://basescan.org',
    label: 'Mainnet',
    siteUrl: 'https://daski.io',
  },
};

export const DEFAULT_TESTNET_GATEWAY_URL = 'https://sandbox-gateway.daski.io';

/** The slice of the instance configuration that islands receive as props. */
export interface NetworkView {
  id: NetworkId;
  label: string;
  chainId: number;
  chainName: string;
  explorerUrl: string;
  /** Public gateway origin, or null while this network has no gateway. */
  gatewayUrl: string | null;
  notice: NetworkNotice;
  /** Where each network's site lives, for the header switch. */
  siteUrls: Record<NetworkId, string>;
}

export function explorerAddress(explorerUrl: string, address: string): string {
  return `${explorerUrl}/address/${address}`;
}

export function explorerTx(explorerUrl: string, hash: string): string {
  return `${explorerUrl}/tx/${hash}`;
}

export function agentPrompt(gatewayUrl: string): string {
  return `Fetch ${gatewayUrl}/skills/setup.md and use the returned setup instructions to buy [service offered on daski]`;
}

export function siteName(view: Pick<NetworkView, 'id' | 'label'>): string {
  return view.id === 'mainnet' ? 'Daski' : `Daski ${view.label}`;
}

export function siteTitle(view: Pick<NetworkView, 'id' | 'label' | 'siteUrls'>): string {
  return `${siteName(view)} · ${new URL(view.siteUrls[view.id]).host}`;
}

export interface NetworkStrip {
  tone: NetworkId;
  kicker: string;
  message: string;
  live: boolean;
}

/** The strip under the header, or null when the instance shows none. */
export function networkStrip(view: Pick<NetworkView, 'notice'>): NetworkStrip | null {
  switch (view.notice) {
    case 'testnet':
      return {
        tone: 'testnet',
        kicker: 'testnet',
        message: `You are viewing the Testnet version of Daski. Services settle in test USDC on ${CHAINS.testnet.chainName}.`,
        live: true,
      };
    case 'mainnet-soon':
      return {
        tone: 'mainnet',
        kicker: 'mainnet · launching soon',
        message: 'Mainnet launching soon. Nothing is live for purchase on Base mainnet yet.',
        live: false,
      };
    default:
      return null;
  }
}

export interface NetworkSwitchLink {
  id: NetworkId;
  label: string;
  href: string;
  active: boolean;
}

/** Service and provider IDs are chain-specific, so those pages switch to the other network's directory. */
export function isChainSpecificPath(pathname: string): boolean {
  return pathname.startsWith('/service/') || pathname.startsWith('/provider/');
}

export function networkSwitchLinks(
  view: Pick<NetworkView, 'id' | 'siteUrls'>,
  pathname: string,
): NetworkSwitchLink[] {
  return NETWORK_IDS.map((id) => {
    const active = id === view.id;
    const path = active || !isChainSpecificPath(pathname) ? pathname : '/';
    return { id, label: CHAINS[id].label, href: `${view.siteUrls[id]}${path}`, active };
  });
}

export class GatewayChainMismatchError extends Error {
  constructor(reported: number, expected: number) {
    super(`gateway reports chain ${reported}, expected ${expected}`);
    this.name = 'GatewayChainMismatchError';
  }
}

/** A gateway serving another chain is refused rather than presented as this network. */
export function assertGatewayChain(reportedChainId: number, expectedChainId: number): void {
  if (reportedChainId !== expectedChainId) {
    throw new GatewayChainMismatchError(reportedChainId, expectedChainId);
  }
}

/** The machine-readable summary served at /llms.txt for this instance. */
export function llmsText(
  view: Pick<NetworkView, 'id' | 'label' | 'chainId' | 'chainName' | 'gatewayUrl' | 'siteUrls'>,
): string {
  if (!view.gatewayUrl) {
    return [
      '# Daski',
      '',
      `Daski is an outcome marketplace for AI agents. The ${view.label} runtime on`,
      `${view.chainName} (chain ID ${view.chainId}) is not published yet: no gateway,`,
      'catalog, or purchasable outcome exists on this network.',
      '',
      `The Testnet runtime is documented at ${view.siteUrls.testnet}/llms.txt.`,
      '',
    ].join('\n');
  }
  const gateway = view.gatewayUrl;
  return [
    '# Daski',
    '',
    `Daski is an outcome marketplace for AI agents. The ${view.label} runtime uses one`,
    `standard x402 V2 Exact-EVM rail with canonical USDC on ${view.chainName}.`,
    '',
    '## Buyer interface',
    '',
    'Discovery is service-first: the public service catalog lists each registered',
    'service with its canonical provider/service ids, skills, paid listings, and',
    'on-chain reputation aggregates. Purchases address a listed outcome.',
    '',
    `Connect the MCP server at \`${gateway}/mcp\` and use the`,
    'single `daski_buy_outcome` tool. The same tool call is used first to receive a',
    '402 challenge and again with the wallet-produced standard payment payload.',
    'There is no separate paid submit tool, payment-time identity registration, or',
    'buyer ERC-8004 registration.',
    '',
    'Before signing, decode and verify the provider, outcome, request summary,',
    'gross amount, commission, legal terms, deadline policy, listing manifest, and',
    'immutable splitter. Recipe-bound outcomes also commit the request and signed',
    'artifacts into the EIP-3009 nonce.',
    '',
    '## Payment and fulfillment',
    '',
    'The buyer signs one standard EIP-3009 transfer authorization to the outcome\'s',
    'immutable splitter. Daski validates it locally, calls the configured standard',
    'facilitator, and reconstructs finalized chain evidence through the configured',
    'Base RPC endpoints. Anyone may then release the splitter, which pays the',
    'Provider and Daski directly.',
    '',
    'Only after deposit and release evidence agree does Daski send the Provider one',
    'signed, replay-safe dispatch. The Provider independently checks the listing,',
    'request, splitter bytecode and immutables, token code, finalized transfers, and',
    'event logs before doing work.',
    '',
    'Order status, input, cancel, artifact, support, reputation, and persistent-asset',
    'actions require a fresh EIP-712 signature from the original payer. Confidential',
    'receipts and private payer-authorized order histories are not public. The public',
    'activity feed exposes chain-derived payer, service, amount, timestamp, and',
    'settlement transaction facts, plus a public Agent identity when resolvable.',
    '',
    '## Final payments and recovery',
    '',
    'Standard-rail payments are final at launch. Daski does not advertise a refund,',
    'guarantee, protected purchase, or independently verified service outcome.',
    'Recovery reconciles ambiguous settlement, release, dispatch, and reputation',
    'writes without guessing or blindly retrying them.',
    '',
    '## Public metadata',
    '',
    `- Service catalog: \`${gateway}/public/v3/services\``,
    `- Service detail: \`${gateway}/public/v3/services/{serviceId}\``,
    `- Purchasable outcomes (payment addressing): \`${gateway}/public/v2/outcomes\``,
    `- x402 discovery: \`${gateway}/.well-known/x402\``,
    `- Rail metadata: \`${gateway}/.well-known/daski-chain.json\``,
    `- MCP metadata: \`${gateway}/.well-known/mcp.json\``,
    `- ${view.chainName} chain ID: \`${view.chainId}\``,
    '',
    'The active rail profile, listings, Provider offers, terms, capacity, deadlines,',
    'screening policy, and control profiles are signed and epoch-fenced. The',
    'facilitator can be replaced without changing a listing or splitter because it',
    'is not part of the immutable financial route.',
    '',
  ].join('\n');
}
