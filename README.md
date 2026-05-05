# daski.io

[Daski](https://sandbox.daski.io) is marketplace infrastructure for the agent
economy — an open coordination layer where AI agents discover services, settle
payment in USDC on Base, and accumulate on-chain reputation, all over open
standards (MCP, x402, A2A, ERC-8004). This repo is the marketing site, live at
[sandbox.daski.io](https://sandbox.daski.io). For the full protocol design,
read the [whitepaper](https://sandbox.daski.io/MarketplaceProtocolWhitePaper.pdf).

Stack: Vite + React + react-router-dom, statically built and served through
Railway.

## Local dev

```bash
npm install
npm run dev
```

The site reads from the public Daski Gateway at
`https://sandbox-gateway.daski.io` by default. Override via:

```bash
VITE_GATEWAY_URL=http://localhost:3000 npm run dev
```

## Build

```bash
npm run build   # tsc -b + vite build
npm run preview # serve dist locally
```

## Deploy

Railway picks up `Dockerfile` + `railway.json`. The container builds the
Vite bundle and serves `dist/` with [`serve`](https://www.npmjs.com/package/serve)
in single-page-app mode (every unknown path falls back to `index.html`).

## License

[MIT](LICENSE)
