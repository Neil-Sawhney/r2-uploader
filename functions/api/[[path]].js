/**
 * Classic Cloudflare Pages Functions adapter for /api/*.
 * Workers + Assets deploys use cloudflare/worker.js instead.
 */
import { applyWorkerEnv } from '../../utils/runtime-env.js'
import checkGithubUser from '../../api/check_github_user.js'
import authCallback from '../../api/auth_callback.js'
import syncConfig from '../../api/sync_config.js'
import pullConfig from '../../api/pull_config.js'
import deleteConfig from '../../api/delete_config.js'

const apiRoutes = new Map([
  ['/api/check_github_user', checkGithubUser],
  ['/api/auth_callback', authCallback],
  ['/api/sync_config', syncConfig],
  ['/api/pull_config', pullConfig],
  ['/api/delete_config', deleteConfig],
])

export async function onRequest(context) {
  applyWorkerEnv(context.env)

  const url = new URL(context.request.url)
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const handler = apiRoutes.get(path)

  if (!handler) {
    return new Response(JSON.stringify({ message: 'not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return handler(context.request)
}
