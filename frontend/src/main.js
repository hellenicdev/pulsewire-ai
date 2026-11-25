import './style.css'
import { safeHttpUrl } from './links.js'

const feed = document.getElementById('feed')
feed.setAttribute('aria-live', 'polite')
feed.setAttribute('aria-busy', 'true')

let hasArticles = false

function renderStatus(className, text, withRetry = false) {
  feed.replaceChildren()

  const box = document.createElement('div')
  box.className = className
  box.setAttribute('role', className === 'error' ? 'alert' : 'status')
  box.textContent = text

  if (withRetry) {
    const retry = document.createElement('button')
    retry.type = 'button'
    retry.className = 'retry'
    retry.textContent = 'Try again'
    retry.addEventListener('click', () => {
      renderStatus('loading', 'Loading the latest headlines…')
      loadNews()
    })
    box.append(document.createElement('br'), retry)
  }

  feed.append(box)
}

function renderError() {
  // Keep showing the last good headlines if a background refresh fails.
  if (hasArticles) return
  renderStatus('error', 'Failed to connect to live backend. It may be waking up, so try again in a minute.', true)
}

function timeAgo(value) {
  const t = Date.parse(value)
  if (!Number.isFinite(t)) return ''
  const mins = Math.round((Date.now() - t) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(t).toLocaleDateString()
}

renderStatus('loading', 'Loading the latest headlines…')

function renderArticles(articles) {
  feed.replaceChildren()
  feed.setAttribute('aria-busy', 'false')

  if (articles.length === 0) {
    hasArticles = false
    renderStatus('loading', 'No headlines right now. Check back soon.')
    return
  }
  hasArticles = true

  for (const article of articles) {
    const card = document.createElement('div')
    card.className = 'card'

    const title = document.createElement('h2')
    title.textContent = typeof article.title === 'string' ? article.title : ''

    const meta = document.createElement('div')
    meta.className = 'meta'
    const source = typeof article.source === 'string' ? article.source : ''
    const when = timeAgo(article.published)
    meta.textContent = when ? `${source} · ${when}` : source

    card.append(title, meta)

    const href = safeHttpUrl(article && article.link)
    if (href) {
      const link = document.createElement('a')
      link.href = href
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.textContent = 'Open Article'
      link.setAttribute('aria-label', `Open article: ${title.textContent}`)
      card.append(link)
    }

    feed.append(card)
  }
}

async function loadNews() {
  try {
    const response = await fetch(
      'https://pulsewire-ai.onrender.com/api/news'
    )

    if (!response.ok) {
      throw new Error(`News request failed: ${response.status}`)
    }

    const articles = await response.json()

    if (!Array.isArray(articles)) {
      throw new Error('News response was not a list')
    }

    renderArticles(articles)
  } catch (err) {
    console.error(err)
    renderError()
  }
}

loadNews()

setInterval(() => {
  if (document.visibilityState === 'visible') loadNews()
}, 60000)
