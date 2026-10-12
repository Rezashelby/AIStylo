/**
 * Static file server for the AIStylo SPA.
 *
 * Node stdlib only — no dependencies, so the runtime image needs no
 * node_modules. Handles the three things a single-page app actually requires:
 * correct content types, immutable caching for fingerprinted assets, and a
 * history-API fallback so deep links render the app instead of 404ing.
 */

import { createServer } from 'node:http'
import { createReadStream, promises as fs } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'

const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '0.0.0.0'
const ROOT = resolve(process.env.STATIC_ROOT ?? './dist')

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.txt':  'text/plain; charset=utf-8',
  '.map':  'application/json; charset=utf-8',
}

const COMPRESSIBLE = new Set([
  '.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.map',
])

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

/**
 * Resolve a URL path to a file inside ROOT, or null if it escapes.
 * Guards against `../` traversal and absolute-path injection.
 */
function safePath(urlPath) {
  let decoded
  try {
    decoded = decodeURIComponent(urlPath)
  } catch {
    return null // malformed percent-encoding
  }
  if (decoded.includes('\0')) return null

  const candidate = resolve(join(ROOT, normalize(decoded)))
  // resolve() collapses traversal; confirm the result is still under ROOT.
  if (candidate !== ROOT && !candidate.startsWith(ROOT + sep)) return null
  return candidate
}

const acceptsGzip = (req) => /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')

async function statFile(path) {
  try {
    const s = await fs.stat(path)
    return s.isFile() ? s : null
  } catch {
    return null
  }
}

async function serveFile(req, res, path, { immutable, status = 200 }) {
  const ext = extname(path).toLowerCase()
  const stats = await statFile(path)
  if (!stats) return false

  // Fingerprinted assets never change under the same name; index.html must be
  // revalidated so a deploy is picked up immediately.
  const cacheControl = immutable
    ? 'public, max-age=31536000, immutable'
    : 'no-cache, must-revalidate'

  const etag = `W/"${stats.size.toString(16)}-${stats.mtimeMs.toString(16)}"`

  // Conditional request: nothing changed, skip the body.
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag, 'Cache-Control': cacheControl, ...SECURITY_HEADERS })
    res.end()
    return true
  }

  const headers = {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    'Cache-Control': cacheControl,
    ETag: etag,
    'Last-Modified': stats.mtime.toUTCString(),
    ...SECURITY_HEADERS,
  }

  const gzip = COMPRESSIBLE.has(ext) && acceptsGzip(req) && stats.size > 512

  if (gzip) {
    headers['Content-Encoding'] = 'gzip'
    headers.Vary = 'Accept-Encoding'
  } else {
    headers['Content-Length'] = stats.size
  }

  res.writeHead(status, headers)
  if (req.method === 'HEAD') return res.end(), true

  const stream = createReadStream(path)
  try {
    if (gzip) await pipeline(stream, createGzip(), res)
    else await pipeline(stream, res)
  } catch (err) {
    // Client disconnects mid-transfer are routine, not errors worth logging.
    if (err?.code !== 'ERR_STREAM_PREMATURE_CLOSE' && err?.code !== 'EPIPE') {
      console.error(`[aistylo] stream failed for ${path}:`, err.message)
    }
  }
  return true
}

const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD', ...SECURITY_HEADERS })
      return res.end('Method Not Allowed')
    }

    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
    const pathname = url.pathname

    // Liveness probe for Docker/Compose/Kubernetes.
    if (pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' })
      return res.end('ok\n')
    }

    const filePath = safePath(pathname)
    if (!filePath) {
      res.writeHead(400, SECURITY_HEADERS)
      return res.end('Bad Request')
    }

    // Fingerprinted bundles: cache hard, and never fall back to index.html —
    // a missing asset should surface as a 404, not a page of HTML.
    if (pathname.startsWith('/assets/')) {
      if (await serveFile(req, res, filePath, { immutable: true })) return
      res.writeHead(404, SECURITY_HEADERS)
      return res.end('Not Found')
    }

    // An exact file match (favicon, robots.txt, …).
    if (pathname !== '/' && (await serveFile(req, res, filePath, { immutable: false }))) return

    // Anything else is a client-side route: hand back the app shell. React
    // Router decides whether it is a real page or renders the 404 view.
    const shell = join(ROOT, 'index.html')
    if (await serveFile(req, res, shell, { immutable: false })) return

    res.writeHead(404, SECURITY_HEADERS)
    res.end('Not Found')
  } catch (err) {
    console.error('[aistylo] request failed:', err)
    if (!res.headersSent) res.writeHead(500, SECURITY_HEADERS)
    res.end('Internal Server Error')
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[aistylo] serving ${ROOT} on http://${HOST}:${PORT}`)
})

// Compose/Kubernetes send SIGTERM; finish in-flight requests before exiting.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`[aistylo] ${signal} received, closing`)
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 10_000).unref()
  })
}
