/**
 * Forms agents send that carry the same value the published schema asks for:
 * an agent id as a JSON number (42 for "42"), a limit as a numeric string, an
 * asset UUID in capitals or with spaces around it. They are rewritten before
 * the SDK validates a tools/call, so tools/list keeps advertising one exact
 * form (the retained tool-surface fixture) while these calls succeed. Any
 * other value reaches validation unchanged and fails with a message that names
 * the expected form (tools.ts).
 *
 * Only top-level arguments are touched. `request`, `input` and
 * `authorization` are provider data or signed material and pass byte for byte.
 * The rewrite is deterministic, so a challenge call and its signed retry that
 * send the same arguments still bind the same values.
 */
const DECIMAL_IDS = new Set(['providerAgentId', 'agentId']);
const INTEGERS = new Set(['limit', 'offset']);
const TRIMMED = new Set(['payer', 'payerAddress', 'wallet', 'serviceId', 'outcomeId', 'orderHandle', 'actionId', 'paymentIdentifier']);
const LOOSE_UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function normalizeValue(key: string, value: unknown): unknown {
  if (DECIMAL_IDS.has(key)) {
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
    return typeof value === 'string' ? value.trim() : value;
  }
  if (INTEGERS.has(key)) {
    return typeof value === 'string' && /^\s*\d{1,7}\s*$/.test(value) ? Number(value) : value;
  }
  if (key === 'providerAssetId' && typeof value === 'string') {
    // The gateway stores asset ids in lowercase; a UUID's case carries no meaning.
    const trimmed = value.trim();
    return LOOSE_UUID.test(trimmed) ? trimmed.toLowerCase() : trimmed;
  }
  if (TRIMMED.has(key) && typeof value === 'string') return value.trim();
  return value;
}

/** A copy of a JSON-RPC tools/call message with harmless argument forms normalized; anything else is returned as is. */
export function normalizeToolCall(message: unknown): unknown {
  if (!message || typeof message !== 'object' || Array.isArray(message)) return message;
  const { method, params } = message as { method?: unknown; params?: unknown };
  if (method !== 'tools/call' || !params || typeof params !== 'object' || Array.isArray(params)) return message;
  const { name, arguments: args } = params as { name?: unknown; arguments?: unknown };
  if (typeof name !== 'string' || !name.startsWith('daski_') || !args || typeof args !== 'object' || Array.isArray(args)) return message;
  const normalized = Object.fromEntries(Object.entries(args).map(([key, value]) => [key, normalizeValue(key, value)]));
  return { ...message, params: { ...params, arguments: normalized } };
}
