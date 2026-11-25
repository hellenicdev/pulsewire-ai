# PulseWire AI

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/S6S31XB030)

A live news wire that pulls the latest headlines from BBC, The New York Times, TechCrunch and The Verge into a single, auto-refreshing feed.

**Live:** https://hellenicdev.eu/pulsewire-ai/

## Features

- Aggregates RSS feeds from several major outlets
- Newest headlines first, with source and "time ago" labels
- Refreshes every 60 seconds while the tab is visible
- Loading, empty and error states with a retry button. If a refresh fails, the last good headlines stay on screen
- 5-minute server cache, with in-flight request deduplication
- One failing feed doesn't break the others
- Rate limiting and a CORS allow-list
- Only safe `http(s)` article links are rendered

## Tech stack

- **Frontend:** Vite and vanilla JavaScript (GitHub Pages, `gh-pages` branch)
- **Backend:** Node.js, Express, rss-parser, express-rate-limit (Render)
- **Tests:** `node:test`

## Setup

```bash
git clone https://github.com/hellenicdev/pulsewire-ai.git

# Backend
cd pulsewire-ai/backend
npm install
npm start      # http://localhost:3000
npm test

# Frontend
cd ../frontend
npm install
npm run dev
npm run build
```

### Environment variables (backend)

| Name | Description |
| --- | --- |
| `CORS_ORIGIN` | Allowed browser origin (default `https://hellenicdev.eu`) |
| `PORT` | HTTP port (default 3000) |

### API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/news` | Up to 25 latest articles `{ title, link, source, published }` |
| GET | `/api/health` | Health check |

## Project structure

```
├── backend/
│   ├── server.js       # Express API, feed aggregation and cache
│   └── news.test.js
└── frontend/
    ├── index.html
    └── src/
        ├── main.js     # Feed rendering and refresh
        ├── links.js    # Safe URL helper
        └── style.css
```

## License

All rights reserved © HellenicDev.

---

Made by [HellenicDev](https://hellenicdev.eu).
