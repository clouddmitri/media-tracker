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

```bash
git clone https://github.com/clouddmitri/media-tracker.git
cd media-tracker

pnpm install
cp .env.example .env

pnpm docker:up
pnpm dev
```

Verify it's running:

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
| `pnpm docker:up`    | Start Postgres and Redis                 |
| `pnpm docker:down`  | Stop containers                          |
| `pnpm docker:logs`  | Follow container logs                    |
| `pnpm docker:reset` | Destroy volumes and restart (wipes data) |

## Health endpoints

| Endpoint            | Purpose                                                              |
| ------------------- | -------------------------------------------------------------------- |
| `GET /health/live`  | Process liveness. Never checks dependencies.                         |
| `GET /health/ready` | Readiness. Checks Postgres and Redis; returns 503 if either is down. |
