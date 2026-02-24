# Deployment Guide — Finanzas Rincón Integral

## Project Architecture Overview

Before deploying, understand what this project consists of:

| Layer | Technology | Port |
|---|---|---|
| Frontend | React 19 + Vite + TailwindCSS | (served by Node) |
| Node.js Server | Express.js (TypeScript) | 5000 (or `PORT` env var) |
| Python Backend | FastAPI + Uvicorn | 8000 (internal) |
| Database | SQLite (default) or PostgreSQL | — |

**Important:** The Node.js process **spawns the Python FastAPI server as a child process** at startup (`backend/venv/bin/python -m uvicorn ...`). This means you need **both Node.js and Python runtimes** on the same machine. This constraint determines which platforms are viable.

---

## Environment Variables

You must configure these before deploying:

### Required
| Variable | Description | Example |
|---|---|---|
| `JWT_SECRET_KEY` | Secret for JWT signing — min 32 chars | `openssl rand -hex 32` output |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `TUNAL_SELLER_PASSWORD` | Password for cashier at Tunal store | `SecurePass123` |
| `SELLER_20J_PASSWORD` | Password for cashier at 20 de Julio store | `SecurePass456` |

### Optional (have defaults)
| Variable | Default | Description |
|---|---|---|
| `ADMIN_DEFAULT_PASSWORD` | `CHANGE_ME_IN_PRODUCTION` | Admin user password |
| `SELLER_DEFAULT_PASSWORD` | `CHANGE_ME_IN_PRODUCTION` | Generic seller password |
| `CASH_CLOSING_THRESHOLD` | `50000` | Cash closing threshold |
| `JWT_ALGORITHM` | `HS256` | JWT algorithm |
| `JWT_EXPIRE_MINUTES` | `1440` | JWT expiration (24h) |
| `PORT` | `5000` | Port for the Node.js server |

> **Note:** If `DATABASE_URL` is not set, the app falls back to SQLite (`finanzas.db`). SQLite is fine for local/single-server use but is not suitable for platforms that reset the filesystem (Render, Railway, etc.).

---

## Local Build Process

Before deploying anywhere, make sure you can build locally:

```bash
# 1. Install Node dependencies
npm install

# 2. Set up Python virtual environment
python3 -m venv backend/venv
backend/venv/bin/pip install fastapi uvicorn sqlalchemy bcrypt passlib \
  python-jose python-multipart pytz apscheduler openpyxl reportlab \
  psycopg2-binary pydantic alembic

# 3. Create your .env file
cp .env.example .env   # or create it manually (see env vars above)

# 4. Build the project (frontend + Node server bundle)
npm run build
# Output: dist/public/ (React app) + dist/index.cjs (Express server)

# 5. Run in production mode
npm start
```

---

## Free Deployment Platforms

### Comparison Table

| Platform | Free Tier | Node.js | Python | Docker | PostgreSQL | Best For |
|---|---|---|---|---|---|---|
| **Render.com** | 750 hrs/mo web service | ✅ | ✅ (via Docker) | ✅ | ✅ (90 days) | Best all-in-one option |
| **Railway.app** | $5/mo credit | ✅ | ✅ (via Docker) | ✅ | ✅ | Simple Docker deploys |
| **Fly.io** | 3 VMs + 3GB storage | ✅ | ✅ (via Docker) | ✅ | ✅ (via Fly Postgres) | Full control |
| **Oracle Cloud Free** | 2 VMs forever | ✅ | ✅ | ✅ | ✅ | Best long-term free |
| **Koyeb** | 1 nano instance | ✅ | ✅ (via Docker) | ✅ | ❌ (paid) | Simple one-service apps |
| **Vercel** | Unlimited | ⚠️ serverless only | ❌ | ❌ | ❌ | **Not suitable** |
| **Netlify** | Unlimited | ❌ | ❌ | ❌ | ❌ | **Not suitable** |

> Because this project requires **both Node.js and Python in the same process**, all viable cloud platforms require **Docker**. The sections below walk through the two best options in detail.

---

## Option 1: Render.com (Recommended for beginners)

### Why Render?
- Free 750 hours/month for a web service (enough for 24/7 for one app)
- Free PostgreSQL for 90 days (then $7/mo)
- Simple GitHub integration — push to deploy
- Supports Docker natively

### Free Tier Limitations
- Web service **sleeps after 15 minutes of inactivity** (cold starts ~30s)
- PostgreSQL free for only 90 days
- 512 MB RAM, shared CPU

### Step 1 — Create a Dockerfile

Create `Dockerfile` at the project root:

```dockerfile
# ---- Build stage ----
FROM node:20-slim AS node-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Final stage ----
FROM node:20-slim
WORKDIR /app

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Copy Node dependencies and built files
COPY --from=node-builder /app/node_modules ./node_modules
COPY --from=node-builder /app/dist ./dist
COPY --from=node-builder /app/package.json ./package.json

# Copy backend source
COPY backend/ ./backend/

# Set up Python venv
RUN python3 -m venv backend/venv
RUN backend/venv/bin/pip install --no-cache-dir \
    fastapi uvicorn sqlalchemy bcrypt passlib \
    python-jose python-multipart pytz apscheduler \
    openpyxl reportlab psycopg2-binary pydantic alembic

EXPOSE 5000
CMD ["npm", "start"]
```

Create `.dockerignore` at the project root:

```
node_modules
backend/venv
backend/__pycache__
backend/**/__pycache__
dist
finanzas.db
.env
*.md
```

### Step 2 — Push to GitHub

```bash
git add Dockerfile .dockerignore
git commit -m "Add Docker configuration for deployment"
git push origin main
```

### Step 3 — Create a PostgreSQL Database on Render

1. Go to [render.com](https://render.com) → **New** → **PostgreSQL**
2. Name: `finanzas-db`
3. Region: pick one close to you (e.g., Ohio or Frankfurt)
4. Plan: **Free**
5. Click **Create Database**
6. Copy the **Internal Database URL** (you will need it in Step 4)

### Step 4 — Deploy the Web Service

1. **New** → **Web Service**
2. Connect your GitHub repository
3. Settings:
   - **Name**: `finanzas-rincon`
   - **Region**: same as your database
   - **Branch**: `main`
   - **Runtime**: **Docker**
   - **Instance Type**: **Free**
4. Go to **Environment** tab and add these variables:

```
DATABASE_URL          = <paste Internal Database URL from Step 3>
JWT_SECRET_KEY        = <generate: openssl rand -hex 32>
TUNAL_SELLER_PASSWORD = <your chosen password>
SELLER_20J_PASSWORD   = <your chosen password>
ADMIN_DEFAULT_PASSWORD = <your chosen admin password>
NODE_ENV              = production
PORT                  = 5000
```

5. Click **Create Web Service**
6. Wait for the build (5–10 minutes first deploy)
7. Your app will be at: `https://finanzas-rincon.onrender.com`

---

## Option 2: Railway.app

### Why Railway?
- $5/month free credit (resets monthly) — enough for a small app
- No sleep/cold starts on free tier
- Built-in PostgreSQL plugin (free within credit)
- Easy Docker deploys

### Free Tier Limitations
- $5/month credit. Typical usage: ~$0.10–0.50/day → credit lasts ~10–30 days/month
- If you exceed credit the service pauses until next month

### Step 1 — Create Dockerfile

Use the same `Dockerfile` and `.dockerignore` from Option 1.

### Step 2 — Deploy

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your repository
3. Railway auto-detects Docker and starts building

### Step 3 — Add PostgreSQL

1. In your Railway project: **New** → **Database** → **Add PostgreSQL**
2. Railway automatically sets `DATABASE_URL` in your service's environment

### Step 4 — Set Environment Variables

Click your service → **Variables** tab → add:

```
JWT_SECRET_KEY         = <generate: openssl rand -hex 32>
TUNAL_SELLER_PASSWORD  = <your chosen password>
SELLER_20J_PASSWORD    = <your chosen password>
ADMIN_DEFAULT_PASSWORD = <your chosen admin password>
NODE_ENV               = production
PORT                   = 5000
```

5. Railway redeploys automatically
6. Click **Settings** → **Networking** → **Generate Domain** for a public URL

---

## Option 3: Fly.io (Most control, best free tier long-term)

### Why Fly.io?
- **3 shared-cpu-1x VMs forever free** (no expiration)
- Persistent storage volumes (1GB free)
- Full Docker support
- Built-in Fly Postgres (free within VM allowance)

### Free Tier Limitations
- Requires a credit card to sign up (but not charged within free limits)
- CLI-based workflow (less GUI than Render)

### Step 1 — Install flyctl

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### Step 2 — Create Dockerfile

Use the same `Dockerfile` and `.dockerignore` from Option 1.

### Step 3 — Initialize the App

```bash
# In your project directory
fly launch --no-deploy
```

This creates a `fly.toml` file. Edit it:

```toml
app = "finanzas-rincon"
primary_region = "mia"   # miami — closest to Colombia

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 5000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[env]
  NODE_ENV = "production"
  PORT = "5000"
```

### Step 4 — Create PostgreSQL Database

```bash
fly postgres create --name finanzas-db --region mia --vm-size shared-cpu-1x --volume-size 1
fly postgres attach finanzas-db --app finanzas-rincon
# This auto-sets DATABASE_URL in your app's secrets
```

### Step 5 — Set Secrets

```bash
fly secrets set \
  JWT_SECRET_KEY="$(openssl rand -hex 32)" \
  TUNAL_SELLER_PASSWORD="YourPassword123" \
  SELLER_20J_PASSWORD="YourPassword456" \
  ADMIN_DEFAULT_PASSWORD="AdminPassword789" \
  --app finanzas-rincon
```

### Step 6 — Deploy

```bash
fly deploy
```

App will be at: `https://finanzas-rincon.fly.dev`

---

## Option 4: Oracle Cloud Always Free (Best long-term, 0 cost forever)

### Why Oracle Cloud?
- **2 ARM VMs (4 CPU + 24 GB RAM total) — free forever, no credit card expiration**
- Full Linux VMs — run anything, no Docker required
- 200 GB block storage, 10 GB object storage, free

### Free Tier Limitations
- Requires credit card for signup (never charged for Always Free resources)
- More complex setup (you manage the server yourself)
- You are responsible for updates and security

### Step 1 — Create Oracle Cloud Account

1. Go to [oracle.com/cloud/free](https://www.oracle.com/cloud/free)
2. Sign up with a credit card (not charged)
3. Select your home region (pick one — can't change later)

### Step 2 — Create a VM

1. **Compute** → **Instances** → **Create Instance**
2. Shape: **VM.Standard.A1.Flex** (ARM, Always Free)
   - 2 OCPUs, 12 GB RAM
3. Image: **Ubuntu 22.04**
4. Add your SSH public key
5. Create the instance and note the **public IP**

### Step 3 — Open Firewall Port

1. **Networking** → **Virtual Cloud Networks** → your VCN → **Security Lists**
2. Add ingress rule: TCP port 80 and 443 from `0.0.0.0/0`
3. Also open port 5000 if you want direct access

### Step 4 — SSH into the VM and Install Dependencies

```bash
ssh ubuntu@<your-oracle-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python
sudo apt install -y python3 python3-pip python3-venv

# Install PostgreSQL (optional, or use Neon.tech free cloud PostgreSQL)
sudo apt install -y postgresql postgresql-contrib
```

### Step 5 — Clone and Set Up the Project

```bash
git clone https://github.com/your-username/your-repo.git finanzas
cd finanzas

# Node dependencies
npm install

# Python environment
python3 -m venv backend/venv
backend/venv/bin/pip install fastapi uvicorn sqlalchemy bcrypt passlib \
  python-jose python-multipart pytz apscheduler openpyxl reportlab \
  psycopg2-binary pydantic alembic

# Environment variables
nano .env
# Add all required variables (see list at top of this document)

# Build
npm run build
```

### Step 6 — Configure PostgreSQL (if self-hosting)

```bash
sudo -u postgres psql
CREATE DATABASE finanzas;
CREATE USER finanzas_user WITH PASSWORD 'strongpassword';
GRANT ALL PRIVILEGES ON DATABASE finanzas TO finanzas_user;
\q
```

Set `DATABASE_URL=postgresql://finanzas_user:strongpassword@localhost/finanzas` in your `.env`.

### Step 7 — Run with PM2 (process manager)

```bash
sudo npm install -g pm2

# Start the app
pm2 start "npm start" --name finanzas

# Save to restart on reboot
pm2 startup
pm2 save
```

### Step 8 — Nginx Reverse Proxy (to serve on port 80/443)

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/finanzas
```

Paste:

```nginx
server {
    listen 80;
    server_name your-domain.com;   # or your Oracle public IP

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/finanzas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Free PostgreSQL Database Options

If you need a hosted PostgreSQL (e.g., for Render after 90 days or as a standalone DB):

| Service | Free Storage | Connections | Notes |
|---|---|---|---|
| **Neon.tech** | 512 MB | 10 | Best free option, serverless PostgreSQL |
| **Supabase** | 500 MB | Unlimited | Also has auth/storage features |
| **ElephantSQL** | 20 MB | 5 | Very limited storage |
| **Aiven** | Trial only | — | 30-day trial |

### Using Neon.tech

1. Go to [neon.tech](https://neon.tech) → Sign up free
2. Create a project → Create a database named `finanzas`
3. Copy the **Connection string** (starts with `postgresql://...`)
4. Set it as `DATABASE_URL` in your deployment platform

---

## Continuous Deployment (Auto-deploy on git push)

All platforms above (Render, Railway, Fly.io) support auto-deploy from GitHub:

- **Render/Railway**: enable auto-deploy in Settings → every push to `main` triggers a new build
- **Fly.io**: use GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Fly.io
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: fly deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Add `FLY_API_TOKEN` (from `fly tokens create deploy`) to your GitHub repository secrets.

---

## Quick Decision Guide

```
Do you want zero setup and simplicity?
  └─ Yes → Render.com (connect GitHub, add env vars, done)

Do you need no cold starts on free tier?
  └─ Yes → Railway.app (no sleeping, $5 credit/month)

Do you want the best free tier long-term (no expiration)?
  └─ Yes → Oracle Cloud Always Free VM
           or Fly.io (3 VMs free forever)

Do you already have a server/VPS?
  └─ Yes → Run directly with Node.js + Python + PM2
```

---

## Post-Deployment Checklist

- [ ] App loads at the public URL
- [ ] Can log in as `Administrador` with your set password
- [ ] Cashier logins work for Tunal and 20J stores
- [ ] Verify automatic backup scheduler runs (check logs at 2:00 AM Colombia time)
- [ ] Change all default passwords immediately after first login
- [ ] Set up HTTPS (automatic on Render/Railway/Fly.io, use Certbot on Oracle VM)
- [ ] Test database connectivity (create a test sale, reload page)
- [ ] Configure backups of your PostgreSQL database separately

---

## Troubleshooting

### Python backend fails to start
The Node server tries to run `backend/venv/bin/python`. Make sure the venv exists in the Docker image or on the server. Check logs for `Failed to start Python backend`.

### `JWT_SECRET_KEY` or password env vars missing
The Python app calls `sys.exit(1)` if required vars are missing. Check platform logs — it will print which variable is missing.

### Database connection error
Verify `DATABASE_URL` is correctly formatted: `postgresql://user:password@host:5432/dbname`. On Neon.tech, add `?sslmode=require` at the end.

### App sleeps on Render (free tier)
Expected behavior. Use [UptimeRobot](https://uptimerobot.com) (free) to ping your URL every 5 minutes to prevent sleeping.

### Port conflicts
The Python backend always uses port 8000 internally. The Node server uses the `PORT` env var (default 5000). Do not change port 8000 without updating `server/index.ts`.
