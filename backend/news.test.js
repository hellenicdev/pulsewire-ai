const test = require('node:test')
const assert = require('node:assert/strict')
const { createApp, collectFeedItems, NewsCache } = require('./server')

const FEEDS = [
  { name: 'Ok', url: 'https://example.com/ok.xml' },
  { name: 'Bad', url: 'https://example.com/bad.xml' }
]

async function withServer(app, run) {
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
  })
  const { port } = server.address()

  try {
    await run(`http://127.0.0.1:${port}`)
  } finally {
    server.closeAllConnections()
    await new Promise((resolve, reject) => {
      server.close(err => (err ? reject(err) : resolve()))
    })
  }
}

test('a failing feed does not drop items from the others', async () => {
  const { articles, failed } = await collectFeedItems(FEEDS, async (url) => {
    if (url.includes('bad')) throw new Error('feed down')

    return {
      items: [
        { title: 'Hello', link: 'https://example.com/a', pubDate: 'today' },
        { title: '<script>alert(1)</script>', link: 'javascript:alert(1)' }
      ]
    }
  })

  assert.equal(failed, 1)
  assert.equal(articles.length, 2)
  assert.equal(articles[0].source, 'Ok')
  assert.equal(articles[0].title, 'Hello')
  assert.equal(articles[1].link, 'javascript:alert(1)')
})

test('cache returns items until the ttl elapses', () => {
  let now = 1_000
  const cache = new NewsCache(5 * 60 * 1000, () => now)
  const items = [{ title: 'A' }]

  assert.equal(cache.get(), null)
  cache.set(items)
  now += 60_000
  assert.deepEqual(cache.get(), items)
  now += 5 * 60 * 1000
  assert.equal(cache.get(), null)
})

test('news endpoint caches a partial result and skips a second fetch', async () => {
  let calls = 0
  const app = createApp({
    feeds: FEEDS,
    parseURL: async (url) => {
      calls += 1
      if (url.includes('bad')) throw new Error('feed down')
      return { items: [{ title: 'Kept', link: 'https://example.com/kept', pubDate: null }] }
    }
  })

  await withServer(app, async (base) => {
    const first = await fetch(`${base}/api/news`)
    const second = await fetch(`${base}/api/news`)
    const body = await second.json()

    assert.equal(first.status, 200)
    assert.equal(second.status, 200)
    assert.equal(body.length, 1)
    assert.equal(body[0].title, 'Kept')
    assert.equal(body[0].source, 'Ok')
    assert.equal(calls, 2)
  })
})

test('every feed failing returns 500 and is not cached', async () => {
  let calls = 0
  const app = createApp({
    feeds: FEEDS,
    parseURL: async () => {
      calls += 1
      throw new Error('all down')
    }
  })

  await withServer(app, async (base) => {
    const first = await fetch(`${base}/api/news`)
    const second = await fetch(`${base}/api/news`)

    assert.equal(first.status, 500)
    assert.equal(second.status, 500)
    assert.deepEqual(await second.json(), { error: 'Failed to fetch RSS feeds' })
    assert.equal(calls, FEEDS.length * 2)
  })
})

test('cors reflects only the configured origin', async () => {
  const app = createApp({ corsOrigin: 'https://hellenicdev.eu' })

  await withServer(app, async (base) => {
    const allowed = await fetch(`${base}/`, {
      headers: { Origin: 'https://hellenicdev.eu' }
    })
    const blocked = await fetch(`${base}/`, {
      headers: { Origin: 'https://evil.example' }
    })
    const preflight = await fetch(`${base}/api/news`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example',
        'Access-Control-Request-Method': 'GET'
      }
    })

    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://hellenicdev.eu')
    assert.equal(blocked.headers.get('access-control-allow-origin'), null)
    assert.equal(preflight.headers.get('access-control-allow-origin'), null)
    assert.equal(allowed.headers.get('x-powered-by'), null)
  })
})

test('rate limit rejects requests past the cap', async () => {
  const app = createApp({ rateLimitMax: 2, rateLimitWindowMs: 60_000 })

  await withServer(app, async (base) => {
    const first = await fetch(`${base}/`)
    const second = await fetch(`${base}/`)
    const third = await fetch(`${base}/`)

    assert.equal(first.status, 200)
    assert.equal(second.status, 200)
    assert.equal(third.status, 429)
    assert.deepEqual(await third.json(), { error: 'Too many requests' })
  })
})
