/**
 * Production Worker for the R2 Uploader SPA.
 * /api/* → existing handlers; everything else → Vite dist/ via ASSETS.
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

    if (!env.ASSETS) {
      return new Response(
        'R2 Uploader Worker is running but ASSETS is not bound. Deploy with wrangler.jsonc (assets.directory = ./dist), not the Hello World template.',
        { status: 500, headers: { 'Content-Type': 'text/plain;charset=UTF-8' } },
      )
    }

    return env.ASSETS.fetch(request)
  },
}
