# ⚽ SportsDeck

**A community discussion platform for Premier League football — live fixtures, standings, match threads, polls, and AI-assisted moderation.**

🔗 **Live demo:** [sports-deck-two.vercel.app/](https://sports-deck-two.vercel.app/) <!-- replace with your Vercel URL -->

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

<!--
  Screenshots: add a few images to a docs/screenshots/ folder and uncomment.
  ![Home](docs/screenshots/home.png)
  ![Match thread](docs/screenshots/thread.png)
-->

---

## About

SportsDeck brings Premier League fans together in one place. It pulls real fixtures, results and standings from [football-data.org](https://www.football-data.org/), automatically opens a discussion thread for every upcoming match, and gives fans the tools to argue about it — posts, replies, polls, and a personalised feed of the people and teams they follow.

To keep conversations healthy, every new post is screened by a toxicity model, and admins get a moderation queue ranked by AI confidence, with tools to hide content, ban users and review ban appeals.

Originally built as a team project for **CSC309 (Programming on the Web)** at the University of Toronto, and since polished and deployed.

## Features

### ⚽ Football data
- **Fixtures & results** for the current Premier League season, filterable by matchday and status
- **Match pages** with score, venue, and a link to the match's discussion thread
- **Live league table** with form, goal difference and points
- **Auto-generated match threads** for every fixture in the next two weeks
- API responses are **cached in Redis** and rate-limited to stay within football-data.org's free tier

### 💬 Community
- **Threads, posts and nested replies**, with tags
- **Search** threads by title, author or tag
- **Polls** with deadlines and one vote per user
- **Edit history** — every edit to a post or reply is versioned and viewable
- **Follow** other fans and browse their followers / following lists
- **Personalised feed** of activity from people you follow, replies to your posts, and your favourite team's matches and threads
- **Public profiles** with favourite team, avatar and activity

### 🤖 AI features (via Hugging Face Inference)
- **Toxicity screening** of new posts (`unitary/toxic-bert`); high-confidence hits are auto-reported to moderators
- **Thread sentiment** — overall mood plus a per-team breakdown for match threads, based on each poster's favourite team (`cardiffnlp/twitter-roberta-base-sentiment-latest`)
- **Daily digest** — a summary of the most active threads, recent results and the top of the table (`facebook/bart-large-cnn`)
- **Translation** of posts and replies to English (`Helsinki-NLP/opus-mt-tc-big-fr-en`, French → English)

### 🛡️ Moderation & accounts
- Email/password sign-up and **GitHub OAuth** login
- JWT access tokens with automatic refresh
- **Report** posts and threads; admin **moderation queue** sorted by AI score and report count
- **Ban / unban** users, with an **appeals** workflow for banned users
- Light / dark theme

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) — UI and REST API routes in one app |
| UI | React 19, Tailwind CSS 4 |
| Language | TypeScript |
| Database | PostgreSQL via [Prisma 7](https://www.prisma.io/) (`@prisma/adapter-pg`) |
| Cache | Redis (`ioredis`) |
| Auth | JWT (`jsonwebtoken`), `bcrypt`, GitHub OAuth |
| External APIs | [football-data.org v4](https://www.football-data.org/), [Hugging Face Inference](https://huggingface.co/inference-api) |
| Hosting | [Vercel](https://vercel.com/) + [Neon](https://neon.tech/) (Postgres) + [Upstash](https://upstash.com/) (Redis) |
| Self-hosting | Docker Compose (app, Postgres, Redis, nginx) |

## Architecture

```
                 ┌──────────────────────────────────────────┐
  Browser ──────▶│  Next.js app                             │
                 │   • React pages (app/**/page.tsx)        │
                 │   • REST API routes (app/api/**/route.ts)│
                 └──────┬───────────────┬──────────┬────────┘
                        │               │          │
                  Prisma ORM         ioredis     fetch
                        │               │          │
                  ┌─────▼────┐    ┌─────▼───┐  ┌───▼─────────────────────┐
                  │PostgreSQL│    │  Redis  │  │ football-data.org       │
                  │ users,   │    │ API     │  │ Hugging Face Inference  │
                  │ threads… │    │ cache   │  └─────────────────────────┘
                  └──────────┘    └─────────┘
```

## Project structure

```
SportsDeck/
├── DEPLOY.md                    # Step-by-step Vercel + Neon + Upstash deployment
├── openapi.yaml                 # API specification
├── start.sh / stop.sh           # Docker Compose helpers (self-hosting)
├── import-data.sh               # Run migrations, sync football data and seed (Docker)
└── sports-deck-backend/         # The Next.js application (frontend + API)
    ├── app/
    │   ├── api/                 # REST API routes
    │   │   ├── users/           #   auth, profiles, follows, feed
    │   │   ├── threads/ posts/ replies/ polls/
    │   │   ├── matches/ matchdays/ standings/
    │   │   ├── reports/ appeals/ admin/
    │   │   └── digest/ translate/ auth/oauth/
    │   ├── lib/                 # Server code: auth, Prisma client, football API, Hugging Face
    │   └── …                    # Pages: threads, matches, standings, feed, profile, admin…
    ├── components/              # Shared React components
    ├── lib/                     # Client-side API and auth helpers
    ├── prisma/
    │   ├── schema.prisma        # Data model
    │   ├── migrations/
    │   ├── seed.ts              # Admin account + demo content
    │   └── syncFootballData.ts  # Imports teams and matches
    ├── Dockerfile
    └── docker-compose.yaml
```

## Getting started (local development)

### Prerequisites
- Node.js 20+
- PostgreSQL and Redis (the quickest way is Docker, shown below)
- A free [football-data.org API key](https://www.football-data.org/client/register)
- A free [Hugging Face access token](https://huggingface.co/settings/tokens) (only needed for the AI features)

### 1. Install

```bash
git clone https://github.com/GGGGGGGrace/SportsDeck.git
cd SportsDeck/sports-deck-backend
npm ci
```

### 2. Start Postgres and Redis

```bash
docker run -d --name sportsdeck-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sportsdeck postgres:15-alpine
docker run -d --name sportsdeck-redis -p 6379:6379 redis:7-alpine
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Then fill in `.env.local`. For the containers above:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sportsdeck"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="<random string>"          # e.g. openssl rand -hex 32
JWT_REFRESH_SECRET="<another random string>"
MATCH_API_KEY="<football-data.org key>"
HF_TOKEN="<hugging face token>"
ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD="<choose a password>"
```

See [`.env.example`](sports-deck-backend/.env.example) for the full list, including the optional GitHub OAuth settings.

### 4. Set up the database

```bash
set -a; . ./.env.local; set +a   # load the variables into your shell
npm run db:migrate               # generate the Prisma client and create tables
npm run db:sync                  # import teams and matches from football-data.org
npm run db:seed                  # create the admin account and demo content
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm start` | Run the production build |
| `npm run lint` | Lint with ESLint |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:sync` | Import teams and matches |
| `npm run db:seed` | Seed admin account and demo content |

## Deployment

The live site runs on **Vercel** (app), **Neon** (Postgres) and **Upstash** (Redis), all on free tiers, and redeploys automatically on every push to `main`. Full instructions are in [DEPLOY.md](DEPLOY.md).

Prefer a single server? `./import-data.sh && ./start.sh` brings up the app, Postgres, Redis and nginx with Docker Compose.

## API

The app exposes a REST API under `/api` — for example:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/users/register`, `/api/users/login` | Create an account / log in (returns JWTs) |
| `GET` | `/api/threads`, `/api/threads/search?q=` | List and search threads |
| `POST` | `/api/threads`, `/api/posts`, `/api/replies` | Create content (auth required) |
| `GET` | `/api/matches?matchday=`, `/api/standings` | Fixtures and league table |
| `GET` | `/api/users/feed` | Personalised activity feed (auth required) |
| `GET` | `/api/threads/{id}/sentiment` | AI sentiment for a thread |
| `GET` | `/api/admin/reports/queue` | Moderation queue (admin only) |

The full specification is in [`openapi.yaml`](openapi.yaml), and a Postman collection is included for trying the endpoints.

## Team

Built by Group 19 for CSC309 at the University of Toronto:

<!-- Names taken from the git history; edit names and add GitHub links as you like -->
- Zhiyuan Wu
- Jinchi Xie

## Acknowledgements

- Football data provided by [football-data.org](https://www.football-data.org/)
- AI models served by [Hugging Face](https://huggingface.co/)
- Parts of the code were written with help from AI assistants; see comments in the source.
