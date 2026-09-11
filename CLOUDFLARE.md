# Deploying R2 Uploader on Cloudflare Workers

This fork is a Vue + Vite SPA. Upstream (`jw-12138/r2-uploader`) is built with Bun and deployed to Vercel. This fork builds with **Node + npm**.

Live targets:

- https://wormhole.neilneilneil.com
- https://r2-uploader.neil-f9b.workers.dev

Both must return `text/html` **R2 Uploader** (same UX as https://r2.jw1.dev/), not `text/plain` `Hello world`.

## Why Workers Builds can be green while production is still Hello World

Verified: both hostnames are the **`r2-uploader` Worker**. The edge script is still Cloudflare’s default Hello World template.

Workers Builds is a **two-step** pipeline ([docs](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)):

1. **Build command** (optional) — e.g. `npm run build`. A successful Vite build makes the GitHub check green.
2. **Deploy command** — this is what replaces the **active** Worker. Default is `npx wrangler deploy`.

Workers Builds **does not honor** `build.command` inside `wrangler.jsonc`. Only the dashboard Build / Deploy commands matter.

A green “Workers Builds: r2-uploader” check therefore does **not** prove the Hello World script was replaced. Typical dashboard settings that produce this:

| Dashboard Deploy command | What happens |
| --- | --- |
| `npx wrangler versions upload` | Uploads a **version**. Does **not** promote it. `workers.dev` keeps the old active Hello World. |
| `npm run build` (Pages-style) | Vite succeeds. Nothing is uploaded. Hello World stays active. |
| empty / missing Wrangler | Build step succeeds; active script stays the dashboard Hello World. |
| `npx wrangler deploy` | Creates a version **and** sets it to 100% traffic. This is what we need. |

Also check **Deployments**: a newer Git version can exist while traffic is still 100% on the original Hello World. Use **Promote**.

## Local build (no Bun)

```bash
npm ci
npm run build
npm run verify:dist
npm run preview          # http://localhost:7896
npx wrangler dev         # Worker + assets
```

`dist/index.html` must contain `R2 Uploader` and a `/assets/*.js` bundle, never `Hello world`.

## Dashboard settings (required)

Workers & Pages → **r2-uploader** → **Settings** → **Build**:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `/` (empty / repo root) |
| Build command | `npm run build` |
| **Deploy command** | `npm run deploy` |
| Non-production deploy | `npx wrangler versions upload` (previews only) |
| Node.js | `20` (`NODE_VERSION=20`) |
| Package manager | npm |

`npm run deploy` runs `vite build` then `wrangler deploy`, which **promotes** the new version to 100% traffic.

Then:

1. **Save**.
2. **Deployments** → **View build history** → **⋯** → **Retry build** on the latest `main` commit (or push an empty commit).
3. Open **Deployments**. The newest version must be the **active** deployment at 100%. If not, **Promote**.
4. Do **not** open **Edit code** and save the Hello World snippet after a Git deploy — that overwrites production again.

Confirm:

```bash
curl -sI https://r2-uploader.neil-f9b.workers.dev | grep -i content-type
curl -s https://r2-uploader.neil-f9b.workers.dev | grep -o '<title>.*</title>'
curl -sI https://wormhole.neilneilneil.com | grep -i content-type
```

Expect `text/html` and `<title>R2 Uploader</title>`.

## Force-deploy from GitHub (needs a token)

This environment cannot log in to Cloudflare. To have GitHub replace the live Worker on every `main` push, add a repo secret:

1. Cloudflare dashboard → **My Profile** → **API Tokens** → **Create Token**.
2. Use **Edit Cloudflare Workers** (or custom: Account → Workers Scripts → Edit, Account → Account Settings → Read).
3. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: the token (do not commit it)

The **Deploy Worker** workflow (`.github/workflows/deploy.yml`) then runs `wrangler deploy` to account `f9b56530b83d8e3412943ccf1ea9057b`.

Locally, with Wrangler logged in:

```bash
npm ci
npm run deploy
```

## Optional runtime secrets (GitHub config sync only)

The upload UI talks to **your** R2 bucket Worker via LocalStorage. These are **not** required for the UI to render:

| Name | Used by |
| --- | --- |
| `D1_KEY` | `/api/sync_config`, `/api/pull_config`, `/api/delete_config` |
| `GITHUB_CLIENT_ID` | `/api/auth_callback` |
| `GITHUB_CLIENT_SECRET` | `/api/auth_callback` |

```bash
npx wrangler secret put D1_KEY
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```
