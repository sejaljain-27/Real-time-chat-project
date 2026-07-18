# Realtime Hub — Chat & Live Crypto Analytics

A polyglot real-time platform combining **two independent backend microservices** behind one React app — built to demonstrate full-stack ownership, WebSocket architecture, and polyglot service design.

## Architecture

```
                 ┌───────────────────────┐
                 │   React (Vite) SPA    │
                 │  socket.io-client +   │
                 │  native WebSocket API │
                 └──────────┬────────────┘
              ┌──────────────┴───────────────┐
              ▼                              ▼
   ┌─────────────────────┐        ┌─────────────────────────┐
   │   chat-service       │        │   analytics-service      │
   │ Node + Express        │        │ FastAPI + native WS      │
   │ Socket.io + JWT auth  │        │ Binance WS ingestion →   │
   │                       │        │ fan-out to browsers      │
   └──────────┬────────────┘        └───────────┬──────────────┘
              │                                 │
              └───────────────┬─────────────────┘
                               ▼
                       ┌───────────────┐
                       │    MongoDB     │
                       │ (2 databases)  │
                       └───────────────┘
```

- **chat-service** (Node.js, Express, Socket.io, Mongoose, JWT, bcrypt): auth, rooms, persisted message history, presence counts, typing indicators.
- **analytics-service** (FastAPI, Motor, native `websockets`): connects once to Binance's public trade stream, persists ticks to Mongo, and fans them out to N browser tabs over its own `/ws/{symbol}` endpoint — browsers never talk to Binance directly.
- **frontend** (React 18 + Vite, plain JS, Tailwind, Recharts): tabbed UI — Chat and Live Analytics — using `socket.io-client` for chat and the native `WebSocket` API (with reconnect/backoff) for the ticker.

## Why two backends instead of one

This intentionally shows both ends of the Node vs. Python ecosystem in one repo: Socket.io's room/ack model for chat, and FastAPI's native async WebSocket + background task model for a push-based data feed — a realistic "polyglot microservices" pattern, not just two frameworks bolted together.

## Running locally (Docker)

```bash
cp chat-service/.env.example chat-service/.env
cp analytics-service/.env.example analytics-service/.env
cp frontend/.env.example frontend/.env
docker compose up --build
```

- Frontend → http://localhost:5173
- chat-service → http://localhost:5000 (health: `/health`)
- analytics-service → http://localhost:8000 (docs: `/docs`, health: `/health`)

## Running locally (without Docker)

```bash
# Terminal 1 — Mongo (or use a local install / Atlas)
docker run -p 27017:27017 mongo:7

# Terminal 2 — chat-service
cd chat-service && cp .env.example .env && npm install && npm run dev

# Terminal 3 — analytics-service
cd analytics-service && cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Terminal 4 — frontend
cd frontend && cp .env.example .env && npm install && npm run dev
```

## Key interview talking points

1. **Why two backend services** — lets each team/language own its domain; chat needs Socket.io's room+ack ergonomics, the ticker needs a long-lived background task feeding a fan-out WebSocket, which FastAPI's `lifespan` + `asyncio.create_task` model handles cleanly.
2. **Upstream resilience** — `binance_client.py` reconnects with exponential backoff (capped at 30s) so a dropped upstream connection doesn't silently stop the feed.
3. **Fan-out, not per-client upstream connections** — one Binance WS connection serves every connected browser tab, via `ConnectionManager`.
4. **Auth** — JWT signed by chat-service, verified both on REST routes (`requireAuth`) and on the Socket.io handshake (`socketAuth`) before a connection is accepted.
5. **Backfill** — both chat (`GET /api/rooms/:id/messages`) and analytics (`GET /api/history`) expose REST history endpoints so the UI isn't empty on first load, with live data appended after.
6. **What's next at scale** — Redis pub/sub between the ingestion task and WS layer to support multiple analytics-service replicas; MongoDB → Timescale/InfluxDB for real production time-series volume.

## Testing

**chat-service** — Jest + Supertest + `mongodb-memory-server` (spins up a real, ephemeral MongoDB per test run, no mocking of Mongoose itself):
```bash
cd chat-service && npm install && npm test
```
Covers registration/login/validation, JWT-protected routes, room creation/uniqueness, and message-history pagination.

**analytics-service** — pytest + pytest-asyncio, with the upstream Binance socket and FastAPI's `WebSocket` faked out so tests run with zero network access:
```bash
cd analytics-service && pip install -r requirements-dev.txt && pytest -v
```
Covers `Tick` serialization, the `ConnectionManager` fan-out/prune-on-disconnect logic, and the Binance message-parsing + stream-URL-building logic in the ingestion client.

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`: chat-service tests, analytics-service tests, and a frontend production build — three parallel jobs, so a broken build or failing test blocks the merge.

## Project layout

```
realtime-hub/
├── .github/workflows/ci.yml   # test + build on every push/PR
├── chat-service/              # Node + Express + Socket.io
│   ├── src/                   # app.js (testable factory), routes, models, sockets
│   └── tests/                 # Jest + Supertest + mongodb-memory-server
├── analytics-service/         # FastAPI + Motor + websockets
│   ├── app/
│   └── tests/                 # pytest + pytest-asyncio, fully mocked/offline
├── frontend/                  # React + Vite + Tailwind + Recharts
└── docker-compose.yml
```
