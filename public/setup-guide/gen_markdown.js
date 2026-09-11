// generate html from markdown, the html should be placed in the same directory as the markdown file

import { marked } from 'marked'
import fs from 'fs/promises'

const baseDir = './public/setup-guide/'
const files = await fs.readdir(baseDir)
const generate_list = files.filter(el => el.endsWith('.md'))

const html_template = `
<!DOCTYPE html>
<html lang="en" data-theme="dark" class="dark">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>NEILS WORMHOLE</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet">
  <meta name="description" content="NEILS WORMHOLE — upload and manage files on Cloudflare R2">
  <meta name="theme-color" content="#0b0b0c">
  <meta name="color-scheme" content="dark">
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b0b0c;
      --raised: #121214;
      --border: #2a2a2e;
      --text: #ececef;
      --muted: #8e8e96;
    }

    html, body {
      background: var(--bg);
      color: var(--text);
      margin: 0;
      font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
      line-height: 1.6;
    }

    #app {
      max-width: 40rem;
      margin: 0 auto;
      padding: 2.75rem 1.25rem 4rem;
    }

    h1, h2, h3, h4 {
      line-height: 1.3;
      font-weight: 600;
    }

    h3 {
      margin-bottom: 1rem;
    }

    #app a {
      color: #c9c9d0;
      text-decoration: underline;
      text-underline-offset: 0.16em;
    }

    #app a:hover {
      color: #fff;
    }

    #app h1 a {
      text-decoration: none;
      color: var(--text);
    }

    .wordmark {
      font-family: "Space Grotesk", Inter, system-ui, sans-serif;
      font-weight: 500;
      font-size: 1.05rem;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      margin: 0 0 2rem;
      padding-bottom: 1.35rem;
      border-bottom: 1px solid var(--border);
    }

    hr {
      border: 0;
      border-top: 1px solid var(--border);
      margin: 3rem 0;
    }

    code, pre {
      background: #161618;
      border: 1px solid var(--border);
      border-radius: 0.45rem;
    }

    code {
      padding: 0.1rem 0.35rem;
      font-size: 0.85em;
    }

    pre {
      padding: 0.9rem 1rem;
      overflow: auto;
    }

    pre code {
      border: 0;
      padding: 0;
      background: transparent;
    }

    img {
      max-width: 100%;
      border-radius: 0.6rem;
    }
  </style>
</head>
<body>
<div id="app">
<h1 class="wordmark">
  <a href="/">NEILS WORMHOLE</a>
</h1>
###HTML###
</div>
</body>
</html>
`

console.log()
for (const path of generate_list) {
  const start = Date.now()
  const md = await fs.readFile(baseDir + path, 'utf8')
  const html = marked.parse(md)

  const html_path = baseDir + path.replace('.md', '.html')
  await fs.writeFile(html_path, html_template.replace('###HTML###', html), 'utf8')

  const end = Date.now()

  console.log(`Generated ${html_path} in ${end - start}ms`)
}
console.log()
