import type { NetworkConfig } from '../lib/network.ts';
import type { McpErrorPayload } from './result.ts';

export class GatewayError extends Error {
  readonly payload: McpErrorPayload;
  constructor(payload: McpErrorPayload) { super(payload.message); this.payload = payload; }
}
export type GatewayReply = { body: Record<string, unknown>; status: number; headers: Headers };

export class GatewayClient {
  private verified?: Promise<void>;
  private readonly config: NetworkConfig;
  private readonly signal?: AbortSignal;
  private readonly request: typeof fetch;
  private readonly clientAddress?: string;
  constructor(config: NetworkConfig, signal?: AbortSignal, request: typeof fetch = fetch, clientAddress?: string) {
    this.config = config; this.signal = signal; this.request = request; this.clientAddress = clientAddress;
  }

  async ensureNetwork(): Promise<void> {
    this.verified ??= this.raw('/.well-known/mcp.json').then(({ body }) => {
      const signing = body.confirmationSigning as { chainId?: unknown } | undefined;
      if (signing?.chainId !== this.config.chainId) throw new GatewayError({
        code: 'GATEWAY_NETWORK_MISMATCH', message: 'The configured gateway does not report this website’s chain.', retryable: false,
      });
    });
    return this.verified;
  }

  async call(path: string, body?: Record<string, unknown>, options: { headers?: HeadersInit; payment?: boolean; allow402?: boolean } = {}): Promise<GatewayReply> {
    await this.ensureNetwork();
    return this.raw(path, body, options);
  }

  private async raw(path: string, body?: Record<string, unknown>, options: { headers?: HeadersInit; payment?: boolean; allow402?: boolean } = {}): Promise<GatewayReply> {
    if (!this.config.gatewayUrl) throw new GatewayError({ code: 'GATEWAY_UNAVAILABLE', message: 'This network is not available yet.', retryable: false });
    const headers = new Headers(options.headers);
    headers.set('accept', 'application/json');
    if (body) headers.set('content-type', 'application/json');
    // Only the server-derived address is forwarded, never caller-supplied proxy headers.
    // On Railway's private network TRUST_PROXY=1 resolves this single hop.
    if (this.config.gatewayInternalUrl && this.clientAddress) headers.set('x-forwarded-for', this.clientAddress);
    const timeout = AbortSignal.timeout(120_000);
    const signal = this.signal ? AbortSignal.any([this.signal, timeout]) : timeout;
    try {
      // No retries or public-origin fallback: a failed POST may already have executed.
      const response = await this.request(`${this.config.gatewayInternalUrl ?? this.config.gatewayUrl}${path}`, {
        method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined,
        signal, redirect: 'error', cache: 'no-store',
      });
      if (!/^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? '')) throw new Error('Expected gateway JSON');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Empty gateway response');
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 8 * 1024 * 1024) throw new Error('Gateway response too large');
          chunks.push(value);
        }
      } finally { await reader.cancel(); }
      const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected gateway object');
      const data = value as Record<string, unknown>;
      if (!response.ok && !(response.status === 402 && options.allow402 && data.x402Version === 2)) {
        const error = (data.error ?? data) as Record<string, unknown>;
        if (typeof error.code !== 'string' || typeof error.message !== 'string') throw new Error('Invalid gateway error');
        throw new GatewayError({ ...error, code: error.code, message: error.message,
          ...(response.headers.get('daski-next-action') ? { next_action: response.headers.get('daski-next-action')! } : {}),
          retryable: typeof error.retryable === 'boolean' ? error.retryable : response.status >= 500 || response.status === 429 ||
            ['ASSET_ACTION_REJECTED', 'ASSET_DESTRUCTIVE_DELAY_ACTIVE'].includes(error.code),
        });
      }
      return { body: data, headers: response.headers, status: response.status };
    } catch (error) {
      if (error instanceof GatewayError) throw error;
      throw new GatewayError({
        code: 'GATEWAY_UNAVAILABLE', message: 'The gateway request did not complete. No automatic retry was made.',
        retryable: true, ...(options.payment ? { paymentMayHaveSettled: true, requiresNewSignature: false,
          next_action: 'Reconcile the original payment identifier before requesting another signature or attempting another purchase.' } : {}),
      });
    }
  }
}
