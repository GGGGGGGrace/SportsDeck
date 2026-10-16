# Deploying SportsDeck (Vercel + Neon + Upstash)

Free-tier setup: Vercel hosts the Next.js app, Neon hosts PostgreSQL and
Upstash hosts Redis. Every push to `main` redeploys automatically.

## 1. Create the database and cache

1. **Neon** (https://neon.tech): create a project and copy the **pooled**
   connection string. This is `DATABASE_URL`.
2. **Upstash** (https://upstash.com): create a Redis database and copy the
   `rediss://...` URL. This is `REDIS_URL`.

## 2. Initialise the database (once, from your machine)

```bash
cd sports-deck-backend
npm ci
cp .env.example .env.production.local   # fill in the values, never commit it
set -a; . ./.env.production.local; set +a

npm run db:migrate   # generate the Prisma client and create tables
npm run db:sync      # import teams and matches from football-data.org
npm run db:seed      # admin account + demo content
```

Re-run `npm run db:migrate` whenever a new migration is added under
`prisma/migrations/`.

## 3. Deploy on Vercel

1. https://vercel.com → **Add New → Project** → import this repository.
2. **Root Directory:** `sports-deck-backend` (framework is detected as Next.js;
   the default build command `npm run build` also generates the Prisma client).
3. **Environment Variables:** add every variable from
   `sports-deck-backend/.env.example` except the `ADMIN_*` ones. Use new,
   random values for `JWT_SECRET` / `JWT_REFRESH_SECRET`.
4. **Deploy.**

## 4. After the first deploy

- In your GitHub OAuth app, set the callback URL to
  `https://<your-project>.vercel.app/auth/callback`.
- Optional: add a custom domain under Project → Settings → Domains.
