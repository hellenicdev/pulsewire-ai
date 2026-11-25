const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const Parser = require('rss-parser')

// Without a timeout a single slow feed could hold /api/news open for ~60s.
const parser = new Parser({ timeout: 10000 })

const PORT = process.env.PORT || 3000
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://hellenicdev.eu'
const CACHE_TTL_MS = 5 * 60 * 1000
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX = 100

const FEEDS = [
  {
    name: "BBC",
    url: "https://feeds.bbci.co.uk/news/rss.xml"
  },
  {
    name: "NYTimes",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml"
  },
  {
    name: "TechCrunch",
    url: "https://feeds.feedburner.com/TechCrunch"
  },
  {
    name: "The Verge",
    url: "https://www.theverge.com/rss/index.xml"
  }
]

class NewsCache {
  constructor(ttlMs, now = Date.now) {
    this.ttlMs = ttlMs
    this.now = now
    this.entry = null
  }

  get() {
    if (!this.entry) return null
    if (this.now() >= this.entry.expiresAt) {
      this.entry = null
      return null
    }
    return this.entry.items
  }

  set(items) {
    this.entry = {
      items,
      expiresAt: this.now() + this.ttlMs
    }
  }
}

async function collectFeedItems(feeds, parseURL) {
  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const data = await parseURL(feed.url)
      const items = Array.isArray(data && data.items) ? data.items : []

      return items.filter(item => item && typeof item.title === 'string' && item.title.trim()).slice(0, 5).map(item => ({
        title: item.title,
        link: item.link,
        source: feed.name,
        published: item.pubDate || null
      }))
    })
  )

  const articles = []
  let failed = 0

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      articles.push(...result.value)
      return
    }

    failed += 1
    console.error(`Failed to fetch ${feeds[index].name}:`, result.reason)
  })

  return { articles, failed }
}

function createApp(options = {}) {
  const app = express()
  const parseURL = options.parseURL || (url => parser.parseURL(url))
  const feeds = options.feeds || FEEDS
  const cache = options.cache || new NewsCache(options.cacheTtlMs || CACHE_TTL_MS)
  const corsOrigin = options.corsOrigin || CORS_ORIGIN
  let inflight = null

  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(cors({
    origin(requestOrigin, callback) {
      if (!requestOrigin || requestOrigin === corsOrigin) {
        callback(null, corsOrigin)
        return
      }

      callback(null, false)
    }
  }))

  app.use(rateLimit({
    windowMs: options.rateLimitWindowMs || RATE_LIMIT_WINDOW_MS,
    limit: options.rateLimitMax || RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ipv6Subnet: 56,
    message: { error: 'Too many requests' }
  }))

  app.get('/', (req, res) => {
    res.json({ status: "PulseWire API running 🚀" })
  })

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/api/news', async (req, res) => {
    try {
      const cached = cache.get()
      if (cached) {
        res.json(cached)
        return
      }

      if (!inflight) {
        inflight = (async () => {
          const { articles, failed } = await collectFeedItems(feeds, parseURL)

          if (failed === feeds.length) {
            return { ok: false }
          }

          // Newest first (the old random comparator gave a biased, unstable order).
          const time = a => {
            const t = Date.parse(a.published)
            return Number.isFinite(t) ? t : 0
          }
          const body = articles
            .sort((a, b) => time(b) - time(a))
            .slice(0, 25)

          if (body.length > 0) cache.set(body)
          return { ok: true, articles: body }
        })().finally(() => {
          inflight = null
        })
      }

      const result = await inflight

      if (!result.ok) {
        res.status(500).json({ error: "Failed to fetch RSS feeds" })
        return
      }

      res.json(result.articles)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: "Failed to fetch RSS feeds" })
    }
  })

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  return app
}

const app = createApp()

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PulseWire API running on port ${PORT}`)
  })
}

module.exports = {
  app,
  createApp,
  collectFeedItems,
  NewsCache
}
