/**
 * Make Vercel-style `process.env` work on Cloudflare Workers / Pages Functions.
 * Bindings from `env` (D1_KEY, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET) are
 * copied onto process.env before the API handlers run.
 */
export function applyWorkerEnv(env) {
  if (!globalThis.process) {
    globalThis.process = { env: {} }
  }
  if (!globalThis.process.env) {
    globalThis.process.env = {}
  }
  if (env) {
    Object.assign(globalThis.process.env, env)
  }
}

export function envVar(name) {
  return globalThis.process?.env?.[name]
}
