# ── Stage 1: Build frontend + Node server ────────────────────────────────────
FROM node:20-slim AS node-builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# ── Stage 2: Runtime (Node + Python) ─────────────────────────────────────────
FROM node:20-slim
WORKDIR /app

# Install Python and PostgreSQL client (pg_dump needed for backups)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy Node production dependencies and built output
COPY --from=node-builder /app/node_modules ./node_modules
COPY --from=node-builder /app/dist ./dist
COPY package.json ./

# Copy Python backend source
COPY backend/ ./backend/

# Set up Python virtual environment (path must match server/index.ts spawn call)
COPY requirements.txt ./
RUN python3 -m venv backend/venv \
    && backend/venv/bin/pip install --no-cache-dir --upgrade pip \
    && backend/venv/bin/pip install --no-cache-dir -r requirements.txt

# Create backups directory (overridden by a Fly.io volume in production)
RUN mkdir -p backups

EXPOSE 5000

ENV NODE_ENV=production

# Run directly (avoids --env-file=.env flag in npm start which fails without .env)
CMD ["node", "dist/index.cjs"]
