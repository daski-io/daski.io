# Buy through Daski

## Recommended CLI flow

Complete intake using `daski_get_outcome_requirements` and the user's supplied facts, then save the request as JSON.

```bash
daski buy --provider <id> --outcome <id> --request <file.json> --json
```

The command obtains a binding quote and payer preflight. Quotation sends the request to the provider for pricing and creates or reuses a draft order. Intake discovery is read-only and creates neither a quote nor an order.

Mailbox purchases require DNS readiness for the intended payer before payment. Supply `payerAddress` to the payment challenge. A readiness rejection includes `readiness` with the required records; display every record with its type, full name, value, and priority. HTTP integrations can also POST `{address,payer}` to the provider's `/services/mailboxes/availability`. For an external domain this includes the payer-specific ownership TXT; MX and SPF alone do not prove ownership. Correct missing records and recheck readiness before requesting a fresh quote.

For a domain managed by Daski, prepare DNS first through the existing payer-authorized `daski_list_assets` and `daski_use_asset` domain DNS actions. Match the domain asset and use the returned relative record host. A registrar write confirms configuration only; wait for readiness to verify public DNS. Never purchase a mailbox to trigger DNS setup. A changed payer requires a new readiness check and quote.

Show the quoted service, provider, request, price, network, payer, and terms. After the user's approval, repeat with `--approve <approval.id>`. The CLI validates the payment, signs with the configured wallet, submits it, and records the gateway's payment identifier and order handle. A refreshed quote can reuse approval while all material terms stay the same.

## Advanced challenge and submission

For clients that manage their own MCP calls, save the `daski_get_payment_challenge` result and use:

```bash
daski sign-payment --challenge <file.json> --provider <id> --outcome <id> --json
```

The command returns the same quote approval requirement as `buy`. After approval, repeat with `--approve <approval.id>` and submit the returned `paymentPayload` to `daski_buy_outcome` with the same provider, outcome, and request. Prefer `_meta["x402/payment"]`; the `paymentPayload` argument is equivalent.

The bridge preserves the issued `payment-identifier.info.id`, computes the authorization nonce, and echoes the issued extensions except `daski-sign-request`. Transport retries reuse the identical signed payload. Client implementations can use [recipe.md]({{SITE_URL}}/skills/recipe.md).

## Errors

Use the response's `retryable`, `requiresNewSignature`, `paymentMayHaveSettled`, and `next_action` fields to select recovery. Correct the named cause before retrying a refused submission.

| Code or condition | Next action |
|---|---|
| REQUEST_SCHEMA_INVALID / PROVIDER_QUOTE_REJECTED | Correct the listed fields from the user's information and intake contract, then obtain the quote. |
| PROVIDER_INTAKE_UNAVAILABLE / PROVIDER_QUOTE_UNAVAILABLE | Retry discovery or quotation when the provider is available. |
| OUTCOME_NOT_FOUND / LISTING_SUPERSEDED | Refresh discovery and select the current outcome. |
| DASKI_HUMAN_APPROVAL_REQUIRED | Show the quote; after approval pass its approval.id with --approve. |
| DASKI_QUOTE_CHANGED | Review the changed material terms and obtain approval of the new quote. |
| DASKI_INSUFFICIENT_USDC | Report the actual quoted amount, payer, network, and shortfall; continue after funding. |
| Configured budget exceeded | Report the quote and the existing budget. Use daski budget if the user requests a settings change. |
| CHALLENGE_EXPIRED | Obtain a fresh quote. Existing approval remains usable when material terms match. |
| Payment shape, extension, nonce, or signature error | Use the pinned bridge and the challenge-bound payload. If paymentMayHaveSettled is true, reconcile first. |
| SIGNATURE_COUNTERFACTUAL_REJECTED | The contract wallet is not deployed. Deploy it (Circle: a zero-value transfer to itself), run daski doctor, then obtain a fresh quote and sign again. |
| SIGNATURE_VERIFICATION_UNAVAILABLE / SIGNATURE_VERIFICATION_BUSY | The signature was not evaluated. Retry the identical request shortly; do not sign again. |
| CONFIRMATION_SPONSORED_REQUIRES_EOA | Sponsored confirmation needs a plain wallet. Repeat with submission direct; the CLI selects it for contract signers. |
| CONFIRMATION_SPONSORSHIP_LIMIT | The sponsored budget is exhausted. Reconcile saved authorizations first. When chainEligible is true and no previous authorization remains live, a direct wallet submission is available. |
| CONFIRMATION_SUBMISSION_PENDING | Keep the saved signature and operation ID; run daski order confirm with --resume. Do not prepare another review. When expected.disposition is operator_attention, the review is held for the operator: stop resuming and contact support with the operation ID. |
| CONFIRMATION_CLIENT_UPGRADE_REQUIRED | Install the gateway-pinned buyer CLI and retain its saved state before resuming. |
| CONFIRMATION_EAS_INCOMPATIBLE | Keep the saved review and report the compatibility failure. Do not edit signing fields or repeat paid attempts. |
| CONFIRMATION_AUTHORIZATION_STILL_LIVE | The saved signature can still execute. Use --reaffirm for the same admitted intent, or explicitly approve a same-nonce replacement as described in orders.md. When expected.disposition is operator_attention, do not reaffirm: the review is held for the operator, so contact support with the operation ID. |
| CONFIRMATION_SUBMISSION_FAILED | Inspect expected.operationId, expected.disposition, and expected.safeRetired. Prepare a fresh review only when safeRetired is true; otherwise retain the journal and reconcile or contact support. |
| CONFIRMATION_REVIEWS_PAUSED | Wait for maintenance to finish, then resume the saved submission. Do not create another signature. |
| PAYMENT_IDENTIFIER_UNKNOWN | Compare the submitted identifier with the one the challenge issued. Follow the gateway's no-settlement response to correct the submission. |
| PAYMENT_IDENTIFIER_CONFLICT | Reconcile the original payment identifier and recover its order. |
| Timeout / PAYMENT_PENDING_RECONCILIATION / paymentMayHaveSettled: true | Run daski order reconcile with the recorded identifier. |
| WALLET_AUTHORIZATION_INVALID | Repeat the order command to obtain fresh read access or action authorization. |
| ARTIFACT_NOT_AVAILABLE | The order is neither completed nor recovered. Read its status; fetch the artifact once it completes. |
| INTERNAL_ERROR | Report correlationId. Reconcile if the signature was submitted and settlement is uncertain. |

## Reconciliation

```bash
daski order reconcile <intentId> --json
```

This command performs the payer-authorized gateway lookup for that exact payment identifier. It signs a read authorization, not another payment. Continue with the returned order handle when settled. For in-flight or ambiguous states, check again later. A definitive absence permits a new purchase after the original refusal's cause is resolved.

The CLI's automatic recovery uses the same lookup. If recovery itself is interrupted, the intent remains in the local store for this command. Gateway order state determines settlement; a balance read or a missing local handle is insufficient.
