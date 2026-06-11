# World Cup 2026 Pool

A self-hosted office pool for the 2026 FIFA World Cup. Create a pool, share a link, let
people make picks. Standings update automatically from live results — **no day-to-day admin
work**.

## Why it's low-maintenance

Results come from the free, public-domain [OpenFootball](https://github.com/openfootball/worldcup.json)
feed (no API key). A scheduled job refreshes results hourly and leaderboards are computed
live, so once a pool is set up nobody has to touch it.

## Formats (chosen per pool)

- **Predict & Lock** — pick group winners/runners-up + champion before kickoff; locks at the
  first match, then scores itself.
- **Sweepstake** — teams are randomly drawn to players (balanced snake distribution); they
  earn points as they win and advance.
- **Survivor** — across the opening group-stage fixtures, back any team playing that day;
  win to survive, last one standing wins.

## Stack

Next.js (App Router) · Postgres (Drizzle ORM) · Vercel + Vercel Cron.

Identity is intentionally lightweight: share a link, enter a display name. The pool creator
holds an admin cookie for locking, running the draw, and manual result overrides.

## Local development

```bash
npm install
docker compose up -d            # local Postgres on :5433
cp .env.example .env            # defaults match docker-compose
npm run db:migrate
npm run db:seed                 # loads the 2026 fixtures/results
npm run dev                     # http://localhost:3000
```

Run the tests (scoring logic is validated against the full 2022 tournament):

```bash
npm test
```

## Deploy (Vercel + Neon)

1. Create a Postgres database (e.g. Neon via the Vercel Marketplace) and copy its
   connection string.
2. Import this repo into Vercel. Set environment variables:
   - `DATABASE_URL` — the Postgres connection string
   - `WC_SEASON` — `2026`
   - `CRON_SECRET` — any random string (protects the cron endpoint)
   - `ADMIN_KEY` — any random string; unlocks `/admin` (the list of all pools). Leave unset to disable that page.
3. Run migrations and seed against the production DB:
   ```bash
   DATABASE_URL='<prod-url>' npm run db:migrate
   DATABASE_URL='<prod-url>' npm run db:seed
   ```
4. Deploy. `vercel.json` registers the hourly cron at `/api/cron/score`, which refreshes
   results automatically.

The admin page also has a "Refresh results now" button and a manual score override as a
fallback if the upstream feed ever lags.
