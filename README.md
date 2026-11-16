# Briefcast

Pick a research topic and a daily time. Every day at that time, an agent researches the
topic from current sources, writes a five-minute script, voices it with **Gnani.ai TTS**,
and emails you a link to the episode.

> Example: "Find all startup funding announced in the last 24 hours", every day at 8:00 AM.

## Architecture

```
 Browser ──► Next.js (web) ──────────────► FastAPI (api) ──► Postgres
   │          Auth.js Google sign-in          │  ▲
   │          /api/backend/* proxy            │  │ enqueue
   │          (session cookie → 5-min JWT)    ▼  │
   │                                        Redis (ARQ)
   │                                           │
   │                                           ▼
   │                                     ARQ worker
   │                          ┌── cron every minute: find due briefings
   │                          └── generate_episode job:
   │                                research agent ── Tavily search/extract
   │                                script writer   ── LLM (OpenRouter)
   │                                TTS             ── Gnani.ai Timbre
   │                                store MP3       ── Postgres
   └──── email link ◄──────────────  mailer        ── Brevo SMTP
```

| Service | Role |
| --- | --- |
| `web` | Next.js 16 + shadcn/ui. Google sign-in (Auth.js). The only public service. |
| `api` | FastAPI. Briefings and episodes CRUD, audio streaming with Range support. |
| `worker` | ARQ worker. Runs the per-minute scheduler and the episode pipeline. |
| `postgres` | Users, briefings, episodes, MP3 audio. |
| `redis` | ARQ job queue. |

### Auth and data isolation

Google sign-in happens in Next.js. The browser only ever holds the Auth.js session cookie.
Every API call goes through `/api/backend/*`, a Next.js route handler that reads the session
and forwards the request to FastAPI with a 5-minute HS256 token (`BACKEND_JWT_SECRET`).
FastAPI verifies issuer, audience and expiry, upserts the user by email, and **every query
filters by `user_id`**, so another user's briefing or episode is a 404, not a 403.
The API is never exposed to the internet.

### Scheduling

A briefing stores wall-clock time + IANA timezone (`08:00`, `Asia/Kolkata`) and a
precomputed `next_run_at` in UTC. Storing the zone rather than an offset keeps 8:00 at 8:00
across DST changes.

Every minute, an ARQ cron job (`unique=True`, so only one worker runs it):

1. `SELECT … WHERE is_active AND next_run_at <= now() FOR UPDATE SKIP LOCKED`
2. inserts one episode per briefing per slot. A unique constraint on
   `(briefing_id, scheduled_for)` makes double scheduling impossible;
3. advances `next_run_at` to the next occurrence after now (missed slots collapse into
   one catch-up episode instead of a burst);
4. commits, then enqueues `generate_episode` with job id `episode:<id>`. ARQ refuses a
   duplicate job id, so re-enqueueing is always safe;
5. recovers episodes that were committed but never enqueued, or whose worker died.

### The agent

`app/agent/research.py` is a bounded tool-calling loop (max 12 steps, max 6 full reads):

- `search_web(query, recency, kind)`: Tavily search, recency `day` by default.
- `read_source(source_id)`: Tavily extract for exact figures and names.
- `finish_research(findings[], coverage_note)`: each finding must cite source ids.

Every search result is registered as `S1, S2, …`. Findings citing unknown ids are dropped,
so the script can only use sources the agent really retrieved. Web text is wrapped as
untrusted data and the prompt tells the model never to follow instructions inside it.

`app/agent/script.py` turns the findings into a spoken script (~750 words ≈ 5 minutes),
with numbers and money written as words for TTS. If the length misses the 85–120% window,
the model gets one revision pass.

### Text-to-speech

Gnani's REST TTS synthesises one text per request, rejects over-long text, and allows one
active request per account. `app/tts.py` splits the script on sentence boundaries
(≤450 chars), synthesises chunks sequentially as 24 kHz WAV, retries 429/5xx with
exponential backoff, halves a chunk that keeps failing, joins PCM with short pauses between
paragraphs, and encodes MP3 with ffmpeg.

### Reliability

Each pipeline stage saves its output. A retried job skips research if the script exists
and skips TTS if audio exists. Transient failures retry up to 3 times with backoff; bad
Gnani credentials or no credit fail fast. Failed episodes show the error and a Retry button.

## Running locally

```bash
docker compose -f docker-compose.dev.yml up -d        # Postgres :5442, Redis :6392

cd backend
cp ../.env.example .env   # fill in keys; DATABASE_URL/REDIS_URL for the dev ports
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload                   # API on :8000
uv run arq app.worker.WorkerSettings                   # worker
uv run pytest                                          # tests

cd ../frontend
npm install
npm run dev                                            # http://localhost:3000
```

Google OAuth redirect URI: `<APP_URL>/api/auth/callback/google`.

## Deploying

`docker compose up -d --build` with a filled `.env` (see `.env.example`). Only `web`
(port 3000) needs a domain.
