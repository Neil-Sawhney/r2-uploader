# Deploying R2 Uploader on Cloudflare Pages / Workers

This fork is a Vue + Vite SPA. Upstream (`jw-12138/r2-uploader`) is built with Bun and deployed to Vercel. This fork builds with **Node + npm** so Cloudflare Pages can deploy it without Bun.

## What was wrong

`https://wormhole.neilneilneil.com` currently returns plain-text `Hello world` on every path (including `/index.html`). That is Cloudflare’s **default Worker template**, not this app.

The repo had no Wrangler / Pages config and no npm lockfile, only `bun.lock`. Connecting the GitHub repo to a new Workers/Pages project therefore either:

1. Deployed the default Hello World Worker (no `wrangler.jsonc` / no `assets` directory), or
2. Failed the Pages build (Bun lockfile / Bun scripts) and left the Hello World deploy in place.

The Vue UI itself was never the thing being served.

## Local build (no Bun)

```bash
npm ci
npm run build
npm run verify:dist
npm run preview
```

Open `http://localhost:7896`. You should see **R2 Uploader**, not “Hello world”.

`npm run start` / `npm run dev` run the Vite dev server on port 7896.

## Cloudflare dashboard settings

Create or update the **Workers & Pages** project that is wired to this repo (production branch: `main`).

### Option A — Workers + Assets (recommended if the live site is Hello World)

This is what `wrangler.jsonc` describes. After merge, the next Git deploy should upload `dist/` and replace the Hello World Worker.

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` (or the dashboard default for a Worker with `wrangler.jsonc`) |
| Root directory | `/` (repo root) |
| Node.js version | `20` (from `.nvmrc` / env `NODE_VERSION=20`) |
| Package manager | **npm** (uses `package-lock.json`) |

If the existing project name is not `r2-uploader`, change `"name"` in `wrangler.jsonc` to match the Cloudflare project so the deploy updates the Worker that already owns `wormhole.neilneilneil.com`.

Manual deploy (needs `CLOUDFLARE_API_TOKEN` + account login):

```bash
npm ci
npm run deploy
```

### Option B — Classic Cloudflare Pages

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Environment variable | `NODE_VERSION=20` |
| Package manager | npm |

`functions/api/[[path]].js` provides `/api/*` on classic Pages. Unknown UI routes fall back to the SPA via `assets.not_found_handling = "single-page-application"` in `wrangler.jsonc`.

## Environment variables (optional)

The upload UI talks to **your** R2 Worker (Endpoint + API key stored in LocalStorage). That does **not** need Pages secrets.

GitHub “sync endpoints” is optional and uses these **server** bindings / env vars if you want that feature on this deployment:

| Name | Required for | Notes |
| --- | --- | --- |
| `D1_KEY` | `/api/sync_config`, `/api/pull_config`, `/api/delete_config` | Same name as upstream. Do not invent a value; use your D1 proxy token if you run one. |
| `GITHUB_CLIENT_ID` | `/api/auth_callback` | GitHub OAuth app client ID. The frontend currently also has upstream’s public client id for the official `r2.jw1.dev` login flow. |
| `GITHUB_CLIENT_SECRET` | `/api/auth_callback` | GitHub OAuth app secret. Set only in the Cloudflare dashboard / Wrangler secrets, never commit it. |

Set secrets with:

```bash
npx wrangler secret put D1_KEY
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

Or in the dashboard: Workers & Pages → project → Settings → Variables and Secrets.

If these are unset, the **file upload / bucket UI still works**. Only GitHub config sync will fail.

## Custom domain

Point `wormhole.neilneilneil.com` at this same Workers/Pages project (Workers & Pages → Custom domains). If a leftover Hello World Worker still has the domain, remove that route so this project can serve it.

## Live site after this PR

If production deploys from `main`, **merge this PR** and wait for the Cloudflare Git build. Then:

1. `https://wormhole.neilneilneil.com` should render the R2 Uploader UI (title “R2 Uploader”, endpoint form, upload controls).
2. `https://wormhole.neilneilneil.com/setup-guide/` should show the setup guide HTML.
3. View source / response `Content-Type` should be `text/html`, not `text/plain` “Hello world”.

This change cannot update the live domain by itself until Cloudflare rebuilds from `main`.
