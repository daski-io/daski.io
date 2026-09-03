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

The site reads from the public Daski Gateway at
`https://sandbox-gateway.daski.io` by default. Override via:

`/public/v3/services` is the sole catalog source. Service detail routes use
the gateway-issued canonical `serviceId`, and category filters are derived
from returned services so new provider categories remain discoverable. The
website does not apply provider, product, jurisdiction, or skill allowlists.
Historical chain activity remains a separate gateway-fed view.

```bash
PUBLIC_GATEWAY_URL=http://localhost:3000 npm run dev
```

Server rendering can reach the gateway over a different origin than the
browser does. `GATEWAY_INTERNAL_URL` is server-only and read at runtime; when
set, SSR fetches use it and the browser keeps using `PUBLIC_GATEWAY_URL`. If
the internal origin fails, SSR falls back to the public origin and retries the
internal one a minute later.

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

Releases (develop→main merges, versioning) are coordinated from
[daski-io/deploy-testnet](https://github.com/daski-io/deploy-testnet).
Maintenance note: `public/llms.txt` carries a **hand-maintained
contract-address table** — refresh it on every contract redeploy (the deploy
runbook's address cascade covers it).

## License

[MIT](LICENSE)
