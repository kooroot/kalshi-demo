# Kalshi Personality

> Discover your trading personality and get personalized market recommendations

## Quick Start

```bash
# Install dependencies
bun install
cd frontend && bun install && cd ..

# Run backend + frontend
bun run dev:all
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

## Project Structure

```
├── backend/           # Hono API server
│   └── src/
│       ├── routes/    # API endpoints
│       ├── services/  # Kalshi API & analyzer
│       ├── db/        # SQLite (Bun built-in)
│       └── types/     # TypeScript types
├── frontend/          # React + TanStack
│   └── src/
│       ├── routes/    # Pages
│       ├── components/# UI components
│       └── lib/       # API client
└── docs/              # Kalshi API reference
```

## Features

- **Personality Analysis** — Analyze your trading history to discover your trading style
- **Smart Recommendations** — Get market suggestions based on your preferences
- **Shareable Profile** — Share your trader profile with others

## Tech Stack

- **Runtime:** Bun
- **Backend:** Hono
- **Frontend:** React + TanStack Router/Query + Tailwind + shadcn/ui
- **Database:** SQLite (Bun built-in)
- **API:** Kalshi (demo.kalshi.co)
