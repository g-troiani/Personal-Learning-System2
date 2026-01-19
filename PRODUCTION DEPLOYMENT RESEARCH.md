
# Production Deployment Research

## Research Overview

Six parallel research agents investigated different aspects of moving this application from localhost to production. Each section below contains implementation-ready findings.

**Research Target:** Deploy the Personal Learning System to the internet with proper security for user data privacy, using cloud services appropriate for small-scale usage (1-5 users initially).

---

## Section 1: Backend Infrastructure (deploy/backend-infrastructure worktree)

### Current Architecture Analysis

**Key Requirements:**
- FastAPI backend (Python 3.11+) on port 8001
- LibreOffice for PPTX→PDF conversion (subprocess, 120s timeout)
- Long-running requests: LLM calls take 30-60+ seconds
- Background tasks via FastAPI's `BackgroundTasks`
- Streaming SSE for AI chat endpoint

### AWS Service Comparison

| Aspect | EC2 | Lambda + API Gateway | ECS | Fargate | App Runner |
|--------|-----|---------------------|-----|---------|------------|
| Setup Complexity | Medium | High | High | Medium | Low |
| Docker Support | Full | Container image only | Full | Full | Full |
| LibreOffice | Yes (install) | Difficult (layers) | Yes | Yes | Yes |
| Long Requests | Unlimited | 15min max, 29s API GW | Unlimited | Unlimited | 120s (extend to 300s) |
| Cold Start | None | 5-30s for containers | None | 0-30s | 0-15s |
| Cost (1-5 users) | $5-15/mo | ~$0-2/mo | $20+/mo | $10-30/mo | $5-25/mo |
| Host Multiple Apps | Yes | No | Complex | Complex | No |

### Lambda NOT Recommended

**Blocking issues:**
1. API Gateway timeout: 29 seconds max - LLM processing takes 30-60+ seconds
2. LibreOffice: Doesn't fit in Lambda layers (500MB limit)
3. SSE streaming: API Gateway doesn't support Server-Sent Events
4. Background tasks: Lambda dies after response

### EC2 Recommended for Multi-Purpose Use

**Why EC2:**
1. Full Linux server - can host multiple services
2. No timeout limits for long-running LLM calls
3. Docker works natively with LibreOffice
4. t3.micro free tier (first year) or t3.small ~$15/month
5. Future-proof: can add other company services to same instance

### LibreOffice Container Strategy

**Option A: Single Container (Recommended for Simplicity)**

```dockerfile
FROM python:3.11-slim

# Install LibreOffice
RUN apt-get update && apt-get install -y \
    libreoffice-impress \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY learn_system/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY learn_system/ ./learn_system/

EXPOSE 8001
CMD ["uvicorn", "learn_system.app.api.server:app", "--host", "0.0.0.0", "--port", "8001"]
```

**Image size:** ~800MB - 1.2GB

### Recommendation: AWS EC2

**Why:**
1. Handles unlimited-length LLM calls (no timeout)
2. Docker works with LibreOffice
3. $8-15/month (t3.micro/t3.small)
4. Can host multiple services on same instance
5. Full server control for future expansion

---

## Section 2: Database and Auth Security (deploy/database-security worktree)

### Supabase Production Checklist

| Setting | Current | Production Value |
|---------|---------|------------------|
| Email Confirmations | Unknown | **Enable** |
| Password Min Length | 6 (default) | **12** |
| Leaked Password Protection | Off | **Enable** |
| Session Duration | 3600s | Keep at 1 hour |

**Actions Required:**
1. Supabase Dashboard > Authentication > Settings > Email: Enable confirmations
2. Set minimum password length = 12
3. Enable leaked password protection

### Secrets Management

**For AWS EC2 deployment:**
```bash
# Create .env file on EC2 (never commit to git)
# Store in /home/ubuntu/app/.env or use AWS Secrets Manager
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="xxx"
ANTHROPIC_API_KEY="xxx"
GROQ_API_KEY="xxx"
CORS_ORIGINS="https://your-app.netlify.app"
ENVIRONMENT="production"
```

**AWS Secrets Manager (recommended for production):**
```bash
aws secretsmanager create-secret --name learning-system/prod \
  --secret-string '{"SUPABASE_SERVICE_ROLE_KEY":"xxx","ANTHROPIC_API_KEY":"xxx"}'
```

**Rotation Schedule (90 days):**
1. Generate new key in provider dashboard
2. Update environment variable
3. Redeploy service
4. Verify functionality
5. Revoke old key

### RLS Audit Query

Run periodically to verify no tables are missing RLS:
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Expected: rowsecurity = true for all user-data tables
```

### Backup Strategy

**Free Tier:** Manual weekly backups via Supabase Dashboard

**Pro Tier ($25/mo):** Point-in-Time Recovery (PITR) up to 7 days

### Security Health Endpoint

Add to `learn_system/app/api/routes/health.py`:

```python
@router.get("/api/health/security")
async def security_health_check():
    client = get_client()

    orphan_check = client.table("content_sources")\
        .select("id", count="exact")\
        .is_("user_id", "null")\
        .execute()

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "orphaned_records": orphan_check.count or 0,
        "status": "healthy" if (orphan_check.count or 0) == 0 else "warning"
    }
```

---

## Section 3: API Security (deploy/api-security worktree)

### CORS Configuration for Production

Current `server.py` includes dev origins always. Fix:

```python
def get_cors_origins() -> list:
    prod_origins_env = os.getenv("CORS_ORIGINS", "")
    prod_origins = [origin.strip() for origin in prod_origins_env.split(",") if origin.strip()]

    is_production = os.getenv("ENVIRONMENT", "development") == "production"

    if is_production:
        if not prod_origins:
            raise ValueError("CORS_ORIGINS must be set in production")
        return prod_origins

    # Development: include localhost
    dev_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
    return dev_origins + prod_origins
```

### Rate Limiting (Critical)

**Install:** `pip install slowapi`

**Create `learn_system/app/api/middleware/rate_limit.py`:**

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
```

**Apply to critical endpoints:**

| Endpoint | Limit | Rationale |
|----------|-------|-----------|
| `POST /api/sources/upload` | 5/hour | Expensive LLM processing |
| `POST /api/ai/chat` | 30/minute | LLM cost control |
| Global default | 100/minute | General protection |

### File Content Validation

Add `python-magic` to validate file content matches extension:

```python
import magic

def validate_file_content(content: bytes, filename: str) -> Optional[str]:
    ext = os.path.splitext(filename)[1].lower()

    if ext in {".txt", ".md"}:
        try:
            content[:1000].decode("utf-8")
        except UnicodeDecodeError:
            return f"File does not appear to be valid {ext}"
        return None

    # Check magic bytes for binary files
    detected = magic.from_buffer(content[:2048], mime=True)
    expected_mimes = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats",
        ".pptx": "application/vnd.openxmlformats",
    }
    if expected_mimes.get(ext) and expected_mimes[ext] not in detected:
        return f"File content does not match {ext} extension. Detected: {detected}"
    return None
```

### Security Headers Middleware

```python
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response
```

---

## Section 4: Frontend Hosting (deploy/frontend-hosting worktree)

### Netlify Configuration

Create `web/netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"

[context.production.environment]
  VITE_API_URL = "https://api.yourdomain.com/api"

[context.deploy-preview.environment]
  VITE_API_URL = "https://api.yourdomain.com/api"
```

### Environment Variables

**Set in Netlify Dashboard (Site Settings > Environment Variables):**

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://bqrdwysxguktbiegkwss.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` |
| `VITE_API_URL` | `https://api.yourdomain.com/api` (your EC2 domain) |

### API URL Already Configurable

`web/src/lib/api.js` line 8:
```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001/api'
```

**No code change needed** - just set `VITE_API_URL` in Netlify.

### Vite Build Optimization

Update `web/vite.config.js`:

```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          pdf: ['pdfjs-dist', 'react-pdf'],
          charts: ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
```

---

## Section 5: DevOps and CI/CD (deploy/devops-cicd worktree)

### GitHub Actions CI Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [DEV, main]
  push:
    branches: [DEV]

jobs:
  frontend-lint:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: './web/package-lock.json'
      - run: npm ci
      - run: npm run lint

  frontend-build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: './web/package-lock.json'
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

  backend-lint:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./learn_system
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install ruff
      - run: ruff check .
```

### Backend Configuration

Create `learn_system/pyproject.toml`:

```toml
[tool.ruff]
target-version = "py39"
line-length = 100
select = ["E", "W", "F", "I", "B", "C4"]
```

### AWS EC2 Configuration

**Docker Compose for EC2 (recommended):**

Create `learn_system/docker-compose.yml`:
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "8001:8001"
    env_file:
      - .env
    restart: unless-stopped

  # Add nginx for SSL termination
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - api
    restart: unless-stopped
```

**Systemd service (alternative to Docker Compose):**

Create `/etc/systemd/system/learning-api.service`:
```ini
[Unit]
Description=Personal Learning System API
After=docker.service
Requires=docker.service

[Service]
WorkingDirectory=/home/ubuntu/app/learn_system
ExecStart=/usr/bin/docker-compose up
ExecStop=/usr/bin/docker-compose down
Restart=always
User=ubuntu

[Install]
WantedBy=multi-user.target
```

### Database Migration Strategy

Use Supabase CLI:
```bash
supabase init
supabase link --project-ref bqrdwysxguktbiegkwss
supabase db push  # Apply migrations
```

### Error Tracking: Sentry

Add to `learn_system/requirements.txt`:
```
sentry-sdk[fastapi]>=1.0
```

Initialize in `server.py`:
```python
import sentry_sdk
sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    environment=os.getenv("ENVIRONMENT", "development"),
)
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `NETLIFY_AUTH_TOKEN` | Netlify personal access token |
| `NETLIFY_SITE_ID` | Netlify site ID |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `EC2_HOST` | EC2 public IP or domain |
| `EC2_SSH_KEY` | SSH private key for EC2 deploy |
| `SENTRY_DSN` | Sentry DSN |

---

## Section 6: Cost Optimization (deploy/cost-optimization worktree)

### Free Tier Analysis

| Service | Free Tier | Key Limits |
|---------|-----------|------------|
| **Netlify** | Yes | 100GB bandwidth, 300 build min/mo |
| **AWS EC2 t3.micro** | Yes (12 months) | 750 hours/month, then ~$8/mo |
| **AWS EC2 t3.small** | No | ~$15/mo |
| **Supabase** | Yes | 500MB DB, 1GB storage, pauses after 7 days |
| **Groq** | Yes | 14,400 req/day |
| **Claude API** | No | Pay per token |

### Cost Estimates

**Minimal Usage (1-2 users, light use):**

| Component | Monthly Cost |
|-----------|--------------|
| Netlify | $0 |
| AWS EC2 t3.micro | $0 (free tier) or $8 |
| Supabase | $0 |
| Groq API | $0 (free tier) |
| Claude API | $1-3 |
| **Total** | **$1-11/month** |

**Moderate Usage (3-5 users, regular use):**

| Component | Monthly Cost |
|-----------|--------------|
| Netlify | $0 |
| AWS EC2 t3.small | $15 |
| Supabase | $0 |
| Groq API | $0-2 |
| Claude API | $5-10 |
| **Total** | **$20-27/month** |

### Cost Control Measures

1. **Claude API spending caps** in Console settings ($10-20 initially)
2. **Approved users whitelist** (M47) prevents unauthorized LLM usage
3. **Rate limiting** on upload endpoints
4. **Use Groq free tier** for flashcard generation

### Recommended Stack for Starting Out

```
Frontend:     Netlify Free Tier ($0)
Backend:      AWS EC2 t3.micro ($0 - free tier for 12 months)
Database:     Supabase Free Tier ($0)
LLM:          Groq Free + Claude (capped at $10/mo)
```

**Start with t3.micro** - it's free for the first 12 months (750 hours/month). Only upgrade to t3.small ($15/mo) once you have enough users to justify the cost.

**Estimated Total: $1-10/month initially (mostly Claude API)**

### Scaling Triggers

| Service | Upgrade When |
|---------|--------------|
| Supabase | Database >400MB or need backups |
| EC2 | CPU consistently >70%, need more RAM |
| Netlify | >100GB bandwidth or >300 build min |
| Claude | Hitting spending cap regularly |

### EC2 Benefits for Multi-Purpose Use

The same EC2 instance can host:
- Personal Learning System backend
- Other company APIs/services
- Development/staging environments
- Cron jobs for automated tasks

---

# Consolidated Production Deployment Plan

## Executive Summary

This plan moves the Personal Learning System from localhost to production with:
- **Frontend:** Netlify (free tier)
- **Backend:** AWS EC2 t3.micro (free tier for 12 months, then $8/mo)
- **Database:** Supabase (already cloud-hosted)
- **Estimated cost:** $1-10/month initially (mostly Claude API costs)
- **Bonus:** Same EC2 can host other company services

## Phase 1: AWS EC2 Setup

### 1.1 Launch EC2 Instance

1. Go to AWS Console > EC2 > Launch Instance
2. Settings:
   - **Name:** `learning-system-prod`
   - **AMI:** Ubuntu Server 24.04 LTS
   - **Instance type:** t3.micro (free tier - start here, upgrade later if needed)
   - **Key pair:** Create new or use existing
   - **Security group:** Allow SSH (22), HTTP (80), HTTPS (443)
   - **Storage:** 20GB gp3

3. Note the public IP or assign an Elastic IP

> **Cost note:** t3.micro is free for 750 hours/month for the first 12 months. This is enough to run 24/7. Only upgrade to t3.small ($15/mo) if you hit CPU/memory limits with more users.

### 1.2 Initial Server Setup

SSH into the instance:
```bash
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>

# Update and install Docker
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git
sudo usermod -aG docker ubuntu
newgrp docker

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx nginx
```

### 1.3 Create Dockerfile

Location: `/learn_system/Dockerfile`

```dockerfile
FROM python:3.11-slim

# Install LibreOffice for PPTX conversion
RUN apt-get update && apt-get install -y \
    libreoffice-impress \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001
CMD ["uvicorn", "app.api.server:app", "--host", "0.0.0.0", "--port", "8001"]
```

### 1.4 Create docker-compose.yml

Location: `/learn_system/docker-compose.yml`

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "8001:8001"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 1.5 Deploy Backend

```bash
# Clone repo on EC2
git clone <your-repo> /home/ubuntu/app
cd /home/ubuntu/app/learn_system

# Create .env file
cat > .env << EOF
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
ANTHROPIC_API_KEY=xxx
GROQ_API_KEY=xxx
CORS_ORIGINS=https://your-app.netlify.app
ENVIRONMENT=production
EOF

# Build and run
docker-compose up -d --build

# Verify
curl http://localhost:8001/api/health
```

### 1.6 Configure Nginx + SSL

```bash
# Point your domain (api.yourdomain.com) to EC2 IP in DNS

# Create nginx config
sudo nano /etc/nginx/sites-available/learning-api

# Add:
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;  # Long timeout for LLM calls
    }
}

# Enable and get SSL
sudo ln -s /etc/nginx/sites-available/learning-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d api.yourdomain.com
```

## Phase 2: Frontend Deployment (Netlify)

### 2.1 Create netlify.toml

Location: `/web/netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

### 2.2 Connect to Netlify

1. Go to Netlify Dashboard > Add new site > Import from Git
2. Select repository, set:
   - Base directory: `web`
   - Build command: `npm run build`
   - Publish directory: `web/dist`
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` = `https://api.yourdomain.com/api` (your EC2 domain)

## Phase 3: Security Hardening

### 3.1 Update CORS for Production

Already configured in `.env` on EC2:
- `ENVIRONMENT=production`
- `CORS_ORIGINS=https://your-app.netlify.app`

### 3.2 Add Rate Limiting

```bash
pip install slowapi
```

Add rate limits to upload (5/hour) and chat (30/minute) endpoints.

### 3.3 Supabase Production Settings

1. Enable email confirmation
2. Set password min length = 12
3. Enable leaked password protection

## Phase 4: CI/CD Setup

### 4.1 Create GitHub Actions Workflow

Location: `.github/workflows/ci.yml`

- Lint frontend (ESLint)
- Build frontend
- Lint backend (Ruff)

### 4.2 Auto-Deploy

- Netlify: Auto-deploys on push to main/DEV
- EC2: SSH deploy via GitHub Actions or manual `git pull && docker-compose up -d --build`

**Simple EC2 deploy script** (create on EC2 at `/home/ubuntu/deploy.sh`):
```bash
#!/bin/bash
cd /home/ubuntu/app
git pull
cd learn_system
docker-compose up -d --build
```

## Phase 5: Monitoring

### 5.1 Error Tracking

Add Sentry SDK to both frontend and backend.

### 5.2 Uptime Monitoring

Configure BetterUptime or UptimeRobot to ping `/api/health` every 5 minutes.

## Implementation Checklist

### Immediate (Before Going Live)
- [ ] Launch EC2 instance (t3.micro or t3.small)
- [ ] Install Docker, nginx, certbot on EC2
- [ ] Create Dockerfile for backend
- [ ] Create docker-compose.yml
- [ ] Deploy backend to EC2
- [ ] Point domain to EC2, configure SSL
- [ ] Create netlify.toml
- [ ] Deploy frontend to Netlify
- [ ] Set all environment variables
- [ ] Test end-to-end: login, upload, study

### Week 1
- [ ] Add rate limiting to upload endpoint
- [ ] Enable Supabase email confirmation
- [ ] Set Claude API spending cap ($20)
- [ ] Add Sentry error tracking
- [ ] Set up uptime monitoring

### Week 2
- [ ] Create GitHub Actions CI workflow
- [ ] Add file content validation
- [ ] Add security headers middleware
- [ ] Document deployment process

### Ongoing
- [ ] Rotate API keys every 90 days
- [ ] Weekly manual database backup
- [ ] Monitor LLM costs
- [ ] Review Sentry errors

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `learn_system/Dockerfile` | Create | Backend container |
| `learn_system/docker-compose.yml` | Create | Container orchestration |
| `web/netlify.toml` | Create | Netlify config |
| `.github/workflows/ci.yml` | Create | CI pipeline |
| `learn_system/pyproject.toml` | Create | Python linting config |
| `learn_system/app/api/server.py` | Modify | Production CORS |
| `learn_system/app/api/middleware/rate_limit.py` | Create | Rate limiting |
| `learn_system/app/api/middleware/security_headers.py` | Create | Security headers |

## Cost Summary

| Phase | Monthly Cost |
|-------|--------------|
| Starting (1-5 users) | $10-25 |
| Growing (5-20 users) | $30-60 |
| Scaling (20+ users) | $80-150 |

**AWS Benefits:**
- Same EC2 instance can host multiple services (no extra cost)
- Predictable pricing (no surprise bills)
- Full control over the server
- Easy to scale vertically (resize instance)

The approved users whitelist (M47) is essential for controlling LLM costs in production.        