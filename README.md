# Media Tracker

Full-stack application for tracking movies and TV shows, with multi-source data aggregation and LLM-powered recommendations.

**Status:** in development.

## Stack

| Layer      | Technology                               |
| ---------- | ---------------------------------------- |
| API        | Node.js 22, Express 5, TypeScript        |
| Database   | PostgreSQL 17                            |
| Cache      | Redis 7                                  |
| Validation | Zod                                      |
| Tooling    | pnpm workspaces, ESLint, Prettier, Husky |

## Prerequisites

- Node.js 22
- pnpm
- Docker Desktop

## Getting started

### 1. API keys

Both are free and take a few minutes:

- **TMDB** — [sign up](https://www.themoviedb.org/signup), then Settings → API. You need the **API Read Access Token** (v4).
- **OMDb** — [request a key](https://www.omdbapi.com/apikey.aspx) on the free tier and activate via the emailed link. Limit: 1,000 requests/day.

### 2. Run it

```bash
git clone https://github.com/clouddmitri/media-tracker.git
cd media-tracker

pnpm install
cp .env.example .env    # add your TMDB and OMDb keys

pnpm docker:up
pnpm exec prisma migrate dev --filter @media-tracker/api
pnpm db:seed
pnpm dev
```

Verify:

```bash
curl localhost:3001/health/ready
```

## Scripts

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `pnpm dev`          | Start the API in watch mode              |
| `pnpm lint`         | Lint all workspaces                      |
| `pnpm typecheck`    | Type-check all workspaces                |
| `pnpm format`       | Format with Prettier                     |
| `pnpm db:migrate`   | Apply pending migrations                 |
| `pnpm db:seed`      | Populate the database with sample data   |
| `pnpm db:reset`     | Drop, re-migrate, and re-seed            |
| `pnpm db:studio`    | Open Prisma Studio                       |
| `pnpm docker:up`    | Start Postgres and Redis                 |
| `pnpm docker:down`  | Stop containers                          |
| `pnpm docker:logs`  | Follow container logs                    |
| `pnpm docker:reset` | Destroy volumes and restart (wipes data) |

## Project structure

```markdown
apps/api/ Express API
src/config/ Environment validation
src/lib/ HTTP client, cache, database, errors
src/repositories/ Data access
src/routes/ HTTP handlers
src/services/ TMDB, OMDb, aggregation
prisma/ Schema, migrations, seed
packages/shared/ Types and Zod schemas shared across workspaces
```

## Health endpoints

| Endpoint            | Purpose                                                              |
| ------------------- | -------------------------------------------------------------------- |
| `GET /health/live`  | Process liveness. Never checks dependencies.                         |
| `GET /health/ready` | Readiness. Checks Postgres and Redis; returns 503 if either is down. |

## Data attribution

Movie and TV metadata from [The Movie Database](https://www.themoviedb.org/).
This product uses the TMDB API but is not endorsed or certified by TMDB.

Aggregate scores from [OMDb](https://www.omdbapi.com/), licensed
CC BY-NC 4.0 (non-commercial use).

User reviews are cached from TMDB and link back to the original source.
