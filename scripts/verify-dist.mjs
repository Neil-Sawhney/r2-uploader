import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const indexPath = join(dist, 'index.html')

function fail(message) {
  console.error(`verify-dist: ${message}`)
  process.exit(1)
}

if (!existsSync(indexPath)) {
  fail(`${indexPath} is missing. Did npm run build succeed?`)
}

const html = readFileSync(indexPath, 'utf8')

if (/^\s*Hello world\s*$/i.test(html) || html.trim() === 'Hello world') {
  fail('dist/index.html is the Hello world placeholder, not the NEILS WORMHOLE app')
}

if (!html.includes('NEILS WORMHOLE')) {
  fail('dist/index.html does not contain "NEILS WORMHOLE"')
}

if (!html.includes('<div id="app">')) {
  fail('dist/index.html is missing the Vue mount point')
}

if (!/src="\/assets\/index-.*\.js"/.test(html) && !/src="\.\/assets\/index-.*\.js"/.test(html) && !/\/assets\/.*\.js/.test(html)) {
  fail('dist/index.html does not reference a Vite JS bundle under /assets/')
}

const assetsDir = join(dist, 'assets')
if (!existsSync(assetsDir) || readdirSync(assetsDir).length === 0) {
  fail('dist/assets/ is missing or empty')
}

if (existsSync(join(dist, '_worker.js'))) {
  const worker = readFileSync(join(dist, '_worker.js'), 'utf8')
  if (worker.includes('Hello world') && !worker.includes('ASSETS')) {
    fail('dist/_worker.js looks like the default Hello world Worker')
  }
}

console.log('verify-dist: dist/ looks like the NEILS WORMHOLE Vue app')
