/**
 * Default Cloudflare Worker entry (C3 / dashboard Hello World path).
 * Replaces `return new Response("Hello world")` with the NEILS WORMHOLE SPA.
 */
import { applyWorkerEnv } from '../utils/runtime-env.js'
import checkGithubUser from '../api/check_github_user.js'
import authCallback from '../api/auth_callback.js'
import syncConfig from '../api/sync_config.js'
import pullConfig from '../api/pull_config.js'
import deleteConfig from '../api/delete_config.js'

const apiRoutes = new Map([
  ['/api/check_github_user', checkGithubUser],
  ['/api/auth_callback', authCallback],
  ['/api/sync_config', syncConfig],
  ['/api/pull_config', pullConfig],
  ['/api/delete_config', deleteConfig],
])

export default {
  async fetch(request, env) {
    applyWorkerEnv(env)

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '') || '/'
    const handler = apiRoutes.get(path)
    if (handler) {
      return handler(request)
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request)
    }

    return new Response(
      `<!DOCTYPE html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><title>NEILS WORMHOLE</title><meta name="color-scheme" content="dark"><style>body{margin:0;background:#0b0b0c;color:#ececef;font-family:system-ui,sans-serif;padding:3rem 1.25rem}h1{font-size:1.05rem;letter-spacing:.22em;font-weight:500}p{color:#8e8e96;max-width:36rem}code{color:#ececef}</style></head><body><h1>NEILS WORMHOLE</h1><p>Worker script is live, but static assets were not uploaded. Redeploy with <code>npx wrangler deploy --assets=./dist</code> after <code>npm run build</code>.</p></body></html>`,
      { status: 503, headers: { 'Content-Type': 'text/html;charset=UTF-8' } },
    )
  },
}
