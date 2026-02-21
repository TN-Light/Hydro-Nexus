# 🗄️ Setup Local Database (No Expiry)

If your TigerDB/Timescale cloud free tier expired, the simplest **no-expiry** fix is to run your own Postgres/TimescaleDB locally using Docker.

This project connects via the standard env var:

- `DATABASE_URL=postgresql://user:pass@host:5432/db`

---

## Option A (Recommended): Local TimescaleDB via Docker Compose

### 1) Prerequisites
- Install Docker Desktop for Windows
- Ensure WSL2 backend is enabled (Docker Desktop default)

### 2) Start the database
From the repo root:

```powershell
docker compose up -d
```

This repo’s `docker-compose.yml` boots TimescaleDB and automatically runs schema + migrations from:

- `db/init/*.sql`

### 3) Set your `.env.local`
Your repo already includes a working local default:

```env
DATABASE_URL="postgresql://postgres:hydro123@localhost:5432/hydro_nexus"
```

### 4) Reset / recreate the DB (clean rebuild)
If you want to **re-create the database again from scratch**:

```powershell
docker compose down -v
docker compose up -d
```

### 5) Create or reset the admin login user
```powershell
node create-admin-user.cjs
```

### 6) Verify
Run the app and check the DB endpoint:

```powershell
pnpm dev
```

Then visit:
- `http://localhost:3000/test-db`
- or `http://localhost:3000/api/test-db`

---

## Option B: Hosted deployment (Vercel/Render/etc.)

### Important reality check
- Vercel cannot run Docker containers for your DB.
- Your deployed app must connect to a database that is **reachable on the public internet** (or via a private network supported by your host).

So you can absolutely use the **same schema and same code** in production, but you must host Postgres somewhere else.

### “No expiry” options
- **Self-host Postgres/TimescaleDB on a VPS** (best for truly no expiry): DigitalOcean / Hetzner / AWS Lightsail, etc.
- **Paid managed Postgres** (no hard expiry as long as you pay): Supabase Pro, Neon paid, Render paid, Railway paid, Aiven, etc.

Free tiers usually have some limitation (sleep/inactivity/credits). If you want *guaranteed* no-expiry, you generally need either self-hosting or a paid plan.

### Deploy steps (high-level)
1. Provision Postgres (optionally TimescaleDB).
2. Apply schema:
   - `schema-updated.sql`
   - migrations in `migration-*.sql`
   - Timescale helpers in `timescale-complete-fix.sql`
   - room-level sensors migration `migration-room-level-sensors-FIXED.sql`
3. In Vercel Project → Settings → Environment Variables:
   - Set `DATABASE_URL` to your hosted DB connection string
   - Set `JWT_SECRET`
4. Redeploy.

---

## If login is failing right now
Login depends on the DB (users table). If your cloud DB expired, you must either:
- Point `DATABASE_URL` to a working DB (local Docker or hosted), and
- Ensure the schema + admin user exist.
