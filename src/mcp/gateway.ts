import type { NetworkConfig } from '../lib/network.ts';
import { pauseRetryAfterSeconds, salesPause, type SalesPause, type SalesStatusReader } from '../lib/salesStatus.ts';
import type { McpErrorPayload } from './result.ts';

export class GatewayError extends Error {
  readonly payload: McpErrorPayload;
  constructor(payload: McpErrorPayload) { super(payload.message); this.payload = payload; }
}
export type GatewayReply = { body: Record<string, unknown>; status: number; headers: Headers };

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Retry-After in whole seconds, from delta-seconds or an HTTP date; null when absent or unusable. */
function retryAfter(value: string | null, now: number): number | null {
  const header = value?.trim();
  if (!header) return null;
  if (/^\d+$/.test(header)) return Math.max(1, Number(header));
  const time = Date.parse(header);
  return Number.isFinite(time) ? Math.max(1, Math.ceil((time - now) / 1000)) : null;
}

/** What the buyer tried while sales were paused: a quote, an unpaid purchase, or a signed payment. */
export type SaleStep = 'quote' | 'purchase' | 'payment';

const PAYMENT_WAIT = 'Do not sign a new payment. Once the pause ends (until, retryAfterSeconds), resend this identical signed payment ' +
  'while its challenge is valid. If an earlier submission of it was uncertain, reconcile its payment identifier first; ' +
  'order and wallet tools keep working.';

/**
 * The SALES_PAUSED error the website returns itself, from the gateway's
 * status, before any gateway call. It carries the same pause fields as the
 * gateway's own refusal.
 */
export function salesPausedError(pause: SalesPause, retryAfterSeconds: number, docs: string, step: SaleStep): McpErrorPayload {
  const end = pause.until ? `until ${pause.until}` : 'for a few minutes';
  return {
    code: 'SALES_PAUSED',
    message: `Daski has paused new quotes and purchases ${end}; orders already paid continue. ` +
      (step === 'payment' ? 'This payment was not sent to the gateway.' : 'Nothing was quoted or charged.'),
    phase: step === 'payment' ? 'payment_validation' : 'challenge',
    retryable: true, requiresNewSignature: false, paymentMayHaveSettled: false,
    reason: pause.reason, since: pause.since, until: pause.until, retryAfterSeconds,
    next_action: step === 'payment' ? PAYMENT_WAIT
      : `Once the pause ends (until, retryAfterSeconds), ${step === 'quote' ? 'request the quote again' : 'call daski_buy_outcome again'}. ` +
        'Discovery, order status and order actions keep working.',
    docs,
  };
}

export class GatewayClient {
  private verified?: Promise<void>;
  private readonly config: NetworkConfig;
  private readonly signal?: AbortSignal;
  private readonly request: typeof fetch;
  private readonly clientAddress?: string;
  private readonly sales?: SalesStatusReader;
  constructor(config: NetworkConfig, signal?: AbortSignal, request: typeof fetch = fetch, clientAddress?: string, sales?: SalesStatusReader) {
    this.config = config; this.signal = signal; this.request = request; this.clientAddress = clientAddress; this.sales = sales;
  }

  private get docs(): string { return `${this.config.siteUrl}/skills/buy.md#errors`; }

  async ensureNetwork(): Promise<void> {
    this.verified ??= this.raw('/.well-known/mcp.json').then(({ body }) => {
      const signing = body.confirmationSigning as { chainId?: unknown } | undefined;
      if (signing?.chainId !== this.config.chainId) throw new GatewayError({
        code: 'GATEWAY_NETWORK_MISMATCH', message: 'The configured gateway does not report this website’s chain.', retryable: false,
      });
    });
    return this.verified;
  }

  /** Refuses before any gateway call while the gateway reports sales paused. An unreadable status counts as open. */
  async assertSalesOpen(step: SaleStep): Promise<void> {
    const status = await this.sales?.(this.config);
    if (status && !status.salesOpen) {
      throw new GatewayError(salesPausedError(status, pauseRetryAfterSeconds(status.until, Date.now()), this.docs, step));
    }
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
        if (error.code === 'SALES_PAUSED') throw new GatewayError(salesPausedRefusal(error, response.headers, !!options.payment));
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

/**
 * The gateway's own SALES_PAUSED refusal (HTTP 503). The gateway's message,
 * phase and next action stand: a payment it already holds is submitted once
 * sales reopen, so it must not be signed again. Only the pause fields are
 * added in the website's shape. A paid call whose refusal does not say
 * whether the payment may have settled counts as possibly settled.
 */
function salesPausedRefusal(error: Record<string, unknown>, headers: Headers, payment: boolean): McpErrorPayload {
  const now = Date.now();
  const sources = [error, record(error.expected), record(error.details)];
  const field = (name: string) => sources.find(source => source[name] != null)?.[name];
  const pause = salesPause({ reason: field('reason'), since: field('since'), until: field('until') });
  const settled = typeof error.paymentMayHaveSettled === 'boolean' ? error.paymentMayHaveSettled : payment;
  const nextAction = headers.get('daski-next-action') ?? (typeof error.next_action === 'string' ? error.next_action : null);
  return {
    ...error,
    code: 'SALES_PAUSED',
    message: String(error.message),
    retryable: typeof error.retryable === 'boolean' ? error.retryable : true,
    requiresNewSignature: typeof error.requiresNewSignature === 'boolean' ? error.requiresNewSignature : false,
    paymentMayHaveSettled: settled,
    reason: pause.reason, since: pause.since, until: pause.until,
    retryAfterSeconds: retryAfter(headers.get('retry-after'), now) ?? pauseRetryAfterSeconds(pause.until, now),
    next_action: nextAction ?? (settled ? 'Reconcile the original payment identifier before another purchase.'
      : payment ? PAYMENT_WAIT : 'Once the pause ends (until, retryAfterSeconds), retry the same request.'),
  };
}
