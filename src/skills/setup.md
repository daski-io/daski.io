# Set up Daski

Daski lets agents discover and buy real-world services. Use the configured signer; key material stays in its protected store. Load this guide and [buy.md]({{SITE_URL}}/skills/buy.md) in full through `daski_get_setup_guide` or a raw fetch before the first purchase.

## Marketplace and network

This guide is for {{CHAIN_NAME}} (chain ID {{CHAIN_ID}}). The public gateway is `{{GATEWAY_URL}}`; the website hosts these instructions and the MCP server at `{{SITE_URL}}/mcp`.

Fetch `{{GATEWAY_URL}}/.well-known/mcp.json` for the supported CLI version, wallet capabilities, and MCP transport URL. Fetch `{{GATEWAY_URL}}/.well-known/daski-chain.json` and verify its `chainId` is {{CHAIN_ID}} before configuring a purchase. If either document is unavailable or the network differs, stop and report it; do not substitute another network.

Select the matching existing CLI profile with `DASKI_PROFILE` or `--profile`. Doctor reports `configFile`; ensure that profile's `gatewayUrl` is `{{GATEWAY_URL}}` and its `chainId` is {{CHAIN_ID}}. Reuse its signer, wallet, and budgets. The generated mainnet profile is disabled until the user chooses that network; do not silently switch profiles or enable mainnet.

## Check existing setup

Run `daski doctor --json` if the CLI is available. Compare `cliVersion` with `buyerCli.version` in `{{GATEWAY_URL}}/.well-known/mcp.json`. Install or upgrade when needed, then run doctor again before choosing a signer. An absent CLI on PATH does not establish that a wallet is missing.

Use doctor's `stateDirectory`, `configFile`, signer, and self-test results. These paths come from the CLI's native home directory or `DASKI_HOME`; a shell's `~` can point elsewhere. Reuse a healthy signer. A missing local key is not a reason to create one; choose the signer below. Doctor may report an empty balance while the signer is healthy; the purchase quote determines how much funding is needed.

## Choose the signer

The default is the Circle agent wallet, on every kind of host. The user owns it through their email, no key sits on the agent's machine, and it signs Daski purchases and order authorizations. Delivery reviews use a separate wallet transaction flow described in [orders.md]({{SITE_URL}}/skills/orders.md). Use it whenever `payerAccounts.types` in `{{GATEWAY_URL}}/.well-known/mcp.json` includes `contract`.

Use another signer only when the user asks for one:

- A local key, only on the user's own durable machine. It cannot be recovered if that machine or its key store is lost.
- Another wallet from the table in [wallets.md]({{SITE_URL}}/skills/wallets.md), which also says which wallets cannot buy on Daski and why.

If `payerAccounts.types` lacks `contract`, that gateway accepts plain wallets only. On the user's own machine use a local key; anywhere else stop and tell the user that this gateway has not enabled contract wallets yet.

## Circle agent wallet

1. Set the wallet up with Circle's own skill: run `curl -sL https://agents.circle.com/skills/setup.md` and follow it, using the **{{CIRCLE_NETWORK}}** session and **{{CIRCLE_CHAIN}}** chain for this gateway. It covers installing the CLI, the terms consent the user must give, login with the user's email and one-time code, and the wallet itself. Circle's skill governs the Circle wallet only; Daski purchases follow this guide.
2. Before requesting a login code, run `circle wallet status --output json`. Compare the exact email the user chose with **both** saved sessions, including expired ones. Circle separates network tokens but requires the same email across the local agent profile. Preserve `+tags`; do not infer whether aliases share a Circle identity. Resolve an account conflict before requesting an OTP. If switching is already authorized, explain that `circle wallet logout --type agent` clears both sessions and perform that switch before login. Otherwise ask for the account choice. Changing `CIRCLE_CLI_HOME` alone does not isolate the OS keychain.
3. After login, run `circle wallet list --chain {{CIRCLE_CHAIN}} --type agent --output json`. A `VALID` token only describes authentication expiry. It does not prove wallet initialization. An empty list alone does not prove a failure; under the user's wallet-setup authorization, run `circle wallet create{{CIRCLE_NETWORK_FLAG}} --output json` once. If it reports `User not initialized`, use the recovery below.
4. Configure Daski: set `DASKI_KEY_BACKEND=circle-agent`, run `daski doctor --json --signer circle-agent`, and set the profile's `signer` to `circle-agent` in `configFile`. Doctor names anything else this gateway's network needs: authentication, deploying the wallet with a zero-value transfer to itself, funding.

Never edit or patch the Daski or Circle CLI. Classify a failure before retrying; the initialization failure below needs a repair before setup can continue.

The supported Circle CLI versions are published as `signerClis.circle-agent` in `{{GATEWAY_URL}}/.well-known/mcp.json`; Circle's skill installs and updates the CLI. Purchase signing and direct review execution are separate capabilities. Read `confirmation.directReview` in the same document: `circleEstimate` permits estimation, while `circleExecute` must be true before the buyer CLI can submit a Circle review on this network.

### Circle initialization recovery

Use this only when the selected {{CIRCLE_NETWORK}} session is valid, its {{CIRCLE_CHAIN}} wallet list is empty, and wallet creation specifically reports `User not initialized`. Circle can finish authentication and skip initialization after an interrupted first login. Repeating normal login/create commands does not repair that state.

Circle CLI 1.2.0 and 1.2.2 have no public initialize/resume command. The earlier recommendation to try legacy login was withdrawn after Circle rejected a v2 account with HTTP 409 / `CONFLICT`: `Account must use the v2 authentication path.` This refusal occurs before a request ID, OTP completion or wallet initialization. It is not an email conflict or a bad OTP. Do not retry legacy login, downgrade authentication, request a code for that refused attempt, or assume an ordinary v2 login will repair it.

Keep the existing session, **same exact email and network**, and Terms consent. Do not log out again, reset credentials, create another identity, switch signers, change global configuration or inspect secret storage. Report the CLI version, selected network, token status, empty wallet list and sanitized error. The account needs a Circle-supported v2 initialization repair or a separately reviewed maintainer repair; ordinary setup must stop here. Offline fake API tests do not prove live service acceptance.

After a repair, verify the result:

```bash
circle wallet status --output json
circle wallet list --chain {{CIRCLE_CHAIN}} --type agent --output json
```

Login success alone is insufficient: initialization may already create the wallets, so list them before attempting any further creation. Continue only once the selected network lists a wallet, then run `daski doctor --json --signer circle-agent` with the original Daski profile and resolve deployment/funding as usual. If the list stays empty, preserve the session and stop; do not repeat an unverified repair or pay from another account as a workaround.

## Local key (durable machine only)

Set `DASKI_HOST_CLASS=durable` on the user's own machine (`ephemeral` anywhere else; the CLI refuses a local key there) and `DASKI_KEY_BACKEND=file` (or `keychain` on macOS and Windows). Without a terminal, provide `DASKI_KEYSTORE_PASSPHRASE_FILE`. Then run `daski wallet create --yes-human-approved` after the user authorizes it.

## Before the first paid purchase

`daski doctor --json` must report no blocking issue, `keyDurability` other than `session-memory`, and `deployed: true` for a contract signer. Record for the user: payer address, order handle, payment identifier, signer kind.

## Install or upgrade

Read `buyerCli.version` from `{{GATEWAY_URL}}/.well-known/mcp.json`. Use that exact version of `@daski/pay`, not the registry's latest version. In the commands below, replace `<buyerCli.version>` with that value, then verify its registry provenance:

```bash
npm view @daski/pay@<buyerCli.version> repository.url
```

The expected repository is `git+https://github.com/daski-io/buyer.git`. When the package version and repository match, use the user's setup authorization:

```bash
npm install -g @daski/pay@<buyerCli.version>
daski doctor --json
```

If the pinned package is unavailable, report that release dependency. Upgrades retain existing wallet keys and spending settings. New profiles approve each paid quote and have no additional default budget. See [wallets.md]({{SITE_URL}}/skills/wallets.md) for optional budgets and hosted signers.

## Connect the marketplace

Use `{{SITE_URL}}/mcp` in the client's MCP configuration; its discovery document is `{{SITE_URL}}/.well-known/mcp.json`. Reuse an existing connection. Discovery and purchases use gateway tools or REST; provider URLs in catalog data identify the provider and its terms.

## Complete the first purchase

1. Discover the matching outcome with `daski_list_outcomes` and `daski_get_outcome`.
2. Build the request from details already supplied. Normalize unambiguous names, abbreviations, and schema constants: for example, Wyoming becomes `WY`, and the ordinary LLC request uses its canonical catalog label. Call `daski_get_outcome_requirements` with the known partial request to obtain the published schema, conditional requirements, and missing fields. Reuse `normalizedSelectors`. Ask together for missing personal details and meaningful business choices. Preserve the user's selected people and roles.
3. Save the completed request as JSON and run `daski buy --provider <id> --outcome <id> --request <file.json> --json`. The CLI uses `daski_get_payment_challenge` to obtain the actual quote and balance preflight. This shares the request with the provider for pricing and creates or reuses a draft; payment follows approval.
4. Present the actual service, provider, request, price, network, payer, and terms from the quote. If funding is insufficient, report the quoted requirement, balance, shortfall, payer address, and network. Once the user approves the purchase and it is payable, repeat the command with `--approve <approval.id>`. Interactive CLI use prompts directly.
5. Keep the returned order handle and payment identifier. Follow [orders.md]({{SITE_URL}}/skills/orders.md) for status, input, and artifacts.

The approval identifier binds the amount and purchase terms. It remains valid across quote expiry when those terms are unchanged; a changed quote returns a new approval identifier. Follow recoverable errors in [buy.md]({{SITE_URL}}/skills/buy.md#errors) and continue.

Carry the requested purchase through setup, intake, quotation, payment, and tracking. Reuse details and authorization already supplied for this task. Keep progress messages focused on the requested outcome and the next useful action.

Once setup is complete: **Use Daski to [your task].**
