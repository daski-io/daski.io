# daski.io

[Daski](https://sandbox.daski.io) is marketplace infrastructure for the agent
economy — an open coordination layer where AI agents discover services, settle
payment in USDC on Base, and accumulate on-chain reputation, all over open
standards (MCP, x402 V2, A2A, ERC-8004). This repo is the marketing site, live at
[sandbox.daski.io](https://sandbox.daski.io). For the full protocol design,
read the [whitepaper](https://sandbox.daski.io/agentic-procurement-protocol-whitepaper.pdf).

Stack: Astro 7 (SSR) + React islands, served through Railway on the Node
adapter. Requires Node >= 22.12; the Docker image runs node:22.
Every page renders real HTML on the first byte so AI crawlers (ChatGPT, Claude,
Perplexity) can read the service catalog without executing JavaScript.

## Local dev

```bash
npm install
npm run dev
```

The same build serves either network. An instance is told its network at
request time through the variables in [.env.example](.env.example); with none
of them set it is the Testnet sandbox site, reading the public Daski Gateway
at `https://sandbox-gateway.daski.io`.

| Variable | Purpose | Default |
|---|---|---|
| `DASKI_NETWORK` | `testnet` or `mainnet` | `testnet` |
| `GATEWAY_URL` | public gateway origin for the server and the browser | the sandbox gateway on testnet, unset on mainnet |
| `GATEWAY_INTERNAL_URL` | server-only origin over Railway private networking | unset |
| `NETWORK_NOTICE` | strip under the header: `testnet`, `mainnet-soon`, `none` | derived from the network and gateway |
| `SITE_URL` | this instance's canonical origin | the network's public host |
| `TESTNET_SITE_URL`, `MAINNET_SITE_URL` | header switch targets | `https://sandbox.daski.io`, `https://daski.io` |
| `EXPLORER_URL` | block explorer origin | Basescan for the configured chain |
| `SITE_ROBOTS` | `index` or `noindex` | `index` |

Chain facts (chain ID, name, explorer) live in `src/lib/chains.ts`, keyed by
network. A mainnet instance without `GATEWAY_URL` renders its empty states and
the launching-soon strip instead of failing. A gateway that reports another
chain is refused, and an unknown `DASKI_NETWORK` or a malformed URL fails
readiness rather than quietly serving another network.

`/public/v3/services` is the sole catalog source. Service detail routes use
the gateway-issued canonical `serviceId`, and category filters are derived
from returned services so new provider categories remain discoverable. The
website does not apply provider, product, jurisdiction, or skill allowlists.
Historical chain activity remains a separate gateway-fed view.

```bash
GATEWAY_URL=http://localhost:3000 npm run dev
```

Server rendering can reach the gateway over a different origin than the
browser does. `GATEWAY_INTERNAL_URL` is server-only; when set, SSR fetches use
it and the browser keeps using `GATEWAY_URL`. If the internal origin fails,
SSR falls back to the public origin and retries the internal one a minute
later.

```bash
GATEWAY_INTERNAL_URL=http://gateway.railway.internal:8080
```

Gateway payloads are cached in the server process for 30 seconds and
refreshed in the background, so pages render from the last good payload
instead of waiting on the gateway.

## Build

```bash
npm run build    # astro build (server output via @astrojs/node standalone)
npm run preview  # serve the production build locally
npm start        # equivalent to: node ./dist/server/entry.mjs
```

## Deploy

Railway picks up `Dockerfile` + `railway.json`. The container runs
`node ./dist/server/entry.mjs` — the standalone Node server emitted by the
Astro Node adapter, which renders every route on demand.

Set `GATEWAY_INTERNAL_URL=http://gateway.railway.internal:8080` on the
website service so server rendering reaches the gateway over Railway private
networking instead of the public Cloudflare hop. The gateway must listen on
IPv6 for private networking to work; SSR falls back to the public origin if
the internal one fails.

Two instances run the same image: the sandbox service with no variables set
at sandbox.daski.io, and the production service with `DASKI_NETWORK=mainnet`
at daski.io. Launching mainnet is setting `GATEWAY_URL` and
`GATEWAY_INTERNAL_URL` on the production service; nothing else changes.

Releases (develop→main merges, versioning) are coordinated from
[daski-io/deploy-testnet](https://github.com/daski-io/deploy-testnet).
`/llms.txt` and `/robots.txt` are rendered from the instance configuration,
and contract addresses come from the gateway's chain metadata, so nothing in
`public/` is hand-maintained per network.

## Contributing

Push to `develop` only when [docs/release-readiness.md](docs/release-readiness.md)
is satisfied: releases promote the exact commit CI proved, and anything a change
needs at deploy time goes in that commit's `Release-*` trailers.

## License

[MIT](LICENSE)
