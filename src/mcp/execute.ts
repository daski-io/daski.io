import type { GuideFile } from '../lib/agentGuides.ts';
import { GatewayClient, GatewayError } from './gateway.ts';
import { mcpError, mcpJson, type McpToolResult } from './result.ts';

export type ReadGuide = (file: GuideFile) => { content: string; sha256: string; url: string };
const part = (value: unknown) => encodeURIComponent(String(value));
const actions: Record<string, string> = {
  daski_get_order_status: 'status', daski_submit_order_input: 'input', daski_cancel_order: 'cancel',
  daski_get_order_artifact: 'artifact', daski_contact_order_support: 'support', daski_get_order_access: 'grant-read',
  daski_confirm_delivery: 'confirmation', daski_revoke_delivery_confirmation: 'revoke-confirmation',
};
function isolateProviderResult(value: Record<string, unknown>) {
  if (!('result' in value)) return value;
  const { result, ...envelope } = value;
  const encoded = Buffer.from(JSON.stringify(result), 'utf8');
  return { ...envelope, untrustedResult: { mediaType: 'application/json', contentEncoding: 'base64',
    byteLength: encoded.byteLength, content: encoded.toString('base64') } };
}

export async function executeTool(name: string, args: Record<string, unknown>, meta: Record<string, unknown> | undefined,
  gateway: GatewayClient, readGuide: ReadGuide): Promise<McpToolResult> {
  try {
    if (name === 'daski_get_setup_guide') {
      const topic = String(args.topic ?? 'setup');
      const guide = readGuide(`${topic}.md` as GuideFile);
      return mcpJson({ topic, markdown: guide.content, sha256: guide.sha256, url: guide.url });
    }
    const outcome = `/outcomes/${part(args.providerAgentId)}/${part(args.outcomeId)}`;
    if (name === 'daski_buy_outcome') {
      const payment = args.paymentPayload ?? meta?.['x402/payment'];
      const response = await gateway.call(`${outcome}/purchase`, {
        request: args.request, ...(args.payerAddress ? { payerAddress: args.payerAddress } : {}),
        ...(payment ? { paymentPayload: payment } : {}),
      }, { allow402: true, payment: !!payment });
      if (response.status === 402) return { ...mcpJson(response.body, { 'x402/payment-required': response.body }), isError: true };
      const { state, ...receipt } = response.body;
      const paymentResponse = response.headers.get('payment-response');
      return mcpJson({ status: state, ...receipt }, paymentResponse
        ? { 'x402/payment-response': JSON.parse(Buffer.from(paymentResponse, 'base64url').toString('utf8')) } : undefined);
    }
    if (name === 'daski_get_payment_challenge') {
      const { body } = await gateway.call(`${outcome}/quote`, {
        request: args.request, ...(args.payerAddress ? { payerAddress: args.payerAddress } : {}),
      });
      return mcpJson(body, { 'x402/payment-required': body.paymentRequired });
    }
    if (name === 'daski_get_outcome_requirements') return mcpJson((await gateway.call(`${outcome}/requirements`, { request: args.request })).body);
    if (name === 'daski_list_outcomes') return mcpJson((await gateway.call('/public/v2/outcomes/search', args)).body);
    if (name === 'daski_get_outcome') return mcpJson((await gateway.call(`/public/v2/outcomes/${part(args.providerAgentId)}/${part(args.outcomeId)}`)).body);

    const action = actions[name];
    if (action) {
      const path = `/orders/${part(args.orderHandle)}/actions/${action}`;
      const request = args.request ?? {};
      if (args.readCapability && (args.authorization || !['status', 'artifact'].includes(action))) {
        return mcpError({ code: 'WALLET_AUTHORIZATION_INVALID', message: 'Provide exactly one of authorization or readCapability for reads.', retryable: false });
      }
      if (!args.authorization && !args.readCapability) {
        const { body } = await gateway.call(`${path}/challenge`, { request });
        return mcpJson({ authorizationRequired: true, authorizationType: 'OrderActionAuthorizationV1', challenge: body });
      }
      const { body } = await gateway.call(path, args.readCapability ? { request } : { request, authorization: args.authorization },
        args.readCapability ? { headers: { authorization: `DaskiReadCap ${args.readCapability}` } } : {});
      return mcpJson(['confirmation', 'revoke-confirmation', 'grant-read'].includes(action) ? body : isolateProviderResult(body));
    }
    const walletPaths: Record<string, string> = {
      daski_list_my_orders: '/wallet/orders', daski_get_my_reputation: '/wallet/reputation',
      daski_list_assets: '/wallet/assets', daski_use_asset: '/wallet/assets/action',
    };
    if (name === 'daski_list_assets' && args.providerAgentId === null && args.cursor !== null) {
      return mcpError({ code: 'WALLET_ACCESS_DENIED', message: 'Wallet authorization rejected', retryable: false });
    }
    if (walletPaths[name]) {
      const { body } = await gateway.call(walletPaths[name]!, args);
      return mcpJson(name === 'daski_use_asset' ? isolateProviderResult(body) : body);
    }
    if (name === 'daski_resolve_agent') return mcpJson((await gateway.call(`/public/v2/registry/identity/${part(args.wallet)}`)).body);
    if (['daski_list_providers', 'daski_get_provider', 'daski_get_service'].includes(name)) {
      const catalog = (await gateway.call('/public/v2/outcomes')).body;
      const outcomes = catalog.outcomes as Array<{ providerAgentId: string; serviceId: string; outcomeId: string }>;
      if (!Array.isArray(outcomes)) throw new Error('Invalid catalog');
      if (name === 'daski_list_providers') {
        const offset = Number(args.offset); const limit = Number(args.limit);
        const ids = [...new Set(outcomes.map(item => String(item.providerAgentId)))];
        const providers = await Promise.all(ids.slice(offset, offset + limit).map(async id => ({
          ...(await gateway.call(`/public/v2/registry/providers/${part(id)}`)).body,
          marketplaceAdmitted: true, activeOutcomeIds: outcomes.filter(item => item.providerAgentId === id).map(item => item.outcomeId),
        })));
        return mcpJson({ offset, limit, total: String(ids.length), providers });
      }
      const provider = name === 'daski_get_provider';
      const matches = outcomes.filter(item => provider ? item.providerAgentId === args.agentId : item.serviceId.toLowerCase() === String(args.serviceId).toLowerCase());
      const { body } = await gateway.call(provider ? `/public/v2/registry/providers/${part(args.agentId)}` : `/public/v2/registry/services/${part(args.serviceId)}`);
      return mcpJson({ ...body, marketplaceAdmitted: matches.length > 0, activeOutcomeIds: matches.map(item => item.outcomeId) });
    }
    return mcpError({ code: 'UNKNOWN_TOOL', message: 'Unknown Daski tool', retryable: false });
  } catch (error) {
    if (error instanceof GatewayError) {
      const payload = error.payload;
      if (payload.code === 'MARKETPLACE_NOT_FOUND') return mcpError({ ...payload, retryable: false,
        next_action: 'Check the id with daski_list_providers or daski_list_outcomes; unknown ids are not retried.' });
      return mcpError(payload);
    }
    return mcpError({ code: name === 'daski_get_setup_guide' ? 'SETUP_GUIDE_UNAVAILABLE' : 'GATEWAY_RESPONSE_INVALID',
      message: 'The request could not be completed. No automatic retry was made.', retryable: true,
      ...(name === 'daski_buy_outcome' && (args.paymentPayload ?? meta?.['x402/payment']) ? {
        paymentMayHaveSettled: true, requiresNewSignature: false,
        next_action: 'Reconcile the original payment identifier before another purchase.',
      } : {}),
    });
  }
}
