# daski.io

[Daski](https://sandbox.daski.io) is marketplace infrastructure for the agent
economy — an open coordination layer where AI agents discover services, settle
payment in USDC on Base, and accumulate on-chain reputation, all over open
standards (MCP, x402, A2A, ERC-8004). This repo is the marketing site, live at
[sandbox.daski.io](https://sandbox.daski.io). For the full protocol design,
read the [whitepaper](https://sandbox.daski.io/MarketplaceProtocolWhitePaper.pdf).

Stack: Astro 6 (SSR) + React islands, served through Railway on the Node
adapter. Requires Node >= 22.12 (Astro 6 floor; the Docker image runs node:22).
Every page renders real HTML on the first byte so AI crawlers (ChatGPT, Claude,
Perplexity) can read the service catalog without executing JavaScript.

## Local dev

```bash
npm install
npm run dev
```

The site reads from the public Daski Gateway at
`https://sandbox-gateway.daski.io` by default. Override via:

```bash
PUBLIC_GATEWAY_URL=http://localhost:3000 npm run dev
```

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

Releases (develop→main merges, versioning) are coordinated from
[daski-io/deploy-testnet](https://github.com/daski-io/deploy-testnet).
Maintenance note: `public/llms.txt` carries a **hand-maintained
contract-address table** — refresh it on every contract redeploy (the deploy
runbook's address cascade covers it).

## License

[MIT](LICENSE)
