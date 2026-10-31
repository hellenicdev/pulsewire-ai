import './style.css'
import { safeHttpUrl } from './links.js'

const feed = document.getElementById('feed')

function renderError() {
  feed.replaceChildren()

  const error = document.createElement('div')
  error.className = 'error'
  error.textContent = 'Failed to connect to live backend.'
  feed.append(error)
}

function renderArticles(articles) {
  feed.replaceChildren()

  for (const article of articles) {
    const card = document.createElement('div')
    card.className = 'card'

    const title = document.createElement('h2')
    title.textContent = typeof article.title === 'string' ? article.title : ''

    const meta = document.createElement('div')
    meta.className = 'meta'
    meta.textContent = typeof article.source === 'string' ? article.source : ''

    card.append(title, meta)

    const href = safeHttpUrl(article && article.link)
    if (href) {
      const link = document.createElement('a')
      link.href = href
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.textContent = 'Open Article'
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

setInterval(loadNews, 60000)
