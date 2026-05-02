# daski.io

Marketing site for the Daski marketplace, served at [sandbox.daski.io](https://sandbox.daski.io).
Vite + React + react-router-dom, statically built and served through Railway.

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
