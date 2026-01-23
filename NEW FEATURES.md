# NEW FEATURES.md

# Infrastructure Deployment Feature

## Feature Overview

**Target:** Deploy the Personal Learning System from localhost to production with:
- **Frontend:** Netlify (free tier)
- **Backend:** AWS EC2 with Docker + Nginx + SSL
- **Database:** Supabase (already cloud-hosted)
- **Estimated cost:** $1-18/month (mostly Claude API costs)

**Problem Statement:** The system currently runs on localhost only. Users cannot access it remotely, and there's no documented deployment process. The goal is to create a production-ready deployment with proper security, SSL, and operational procedures.

**Research Methodology:** Six parallel worktrees investigated distinct aspects:
1. **infra/ec2-setup** - AWS EC2 instance, security groups, SSH configuration
2. **infra/docker-config** - Docker installation, Dockerfile, docker-compose
3. **infra/nginx-ssl** - Nginx reverse proxy, SSL/TLS with Let's Encrypt
4. **infra/netlify-frontend** - Netlify configuration, environment variables
5. **infra/deployment-docs** - Documentation structure, runbook templates
6. **infra/system-integration** - Systemd services, deployment scripts, monitoring

---

## Architecture Overview

```
                                 PRODUCTION ARCHITECTURE
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   [User Browser]                                                             │
│         │                                                                    │
│         │ HTTPS                                                              │
│         ▼                                                                    │
│   ┌─────────────┐                          ┌─────────────────────────────┐   │
│   │   Netlify   │  ─────── HTTPS ────────▶ │        Supabase             │   │
│   │  (Frontend) │                          │  ┌───────────────────────┐  │   │
│   │  React SPA  │                          │  │   PostgreSQL (RLS)    │  │   │
│   └──────┬──────┘                          │  └───────────────────────┘  │   │
│          │ HTTPS                           │  ┌───────────────────────┐  │   │
│          ▼                                 │  │   Auth (JWT)          │  │   │
│   ┌─────────────┐                          │  └───────────────────────┘  │   │
│   │   Nginx     │  ─────── HTTPS ────────▶ │  ┌───────────────────────┐  │   │
│   │  (Reverse   │                          │  │   Storage (Documents) │  │   │
│   │   Proxy)    │                          │  └───────────────────────┘  │   │
│   │  SSL/TLS    │                          └─────────────────────────────┘   │
│   └──────┬──────┘                                                            │
│          │ HTTP (localhost)                                                  │
│          ▼                                                                   │
│   ┌─────────────┐                          ┌─────────────────────────────┐   │
│   │  FastAPI    │  ─────── HTTPS ────────▶ │      External APIs          │   │
│   │  (Backend)  │                          │  ┌───────────┐ ┌─────────┐  │   │
│   │  Docker     │                          │  │ Anthropic │ │  Groq   │  │   │
│   │  LibreOffice│                          │  │ (Claude)  │ │ (Fast)  │  │   │
│   └─────────────┘                          │  └───────────┘ └─────────┘  │   │
│   [AWS EC2 t3.micro]                       └─────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Cost Analysis

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

**Minimal Usage (1-2 users):**

| Component | Monthly Cost |
|-----------|--------------|
| Netlify | $0 |
| AWS EC2 t3.micro | $0 (free tier) or $8 |
| Supabase | $0 |
| Groq API | $0 |
| Claude API | $1-5 |
| **Total** | **$1-13/month** |

**Moderate Usage (3-5 users):**

| Component | Monthly Cost |
|-----------|--------------|
| Netlify | $0 |
| AWS EC2 t3.small | $15 |
| Supabase | $0 |
| Claude API | $5-10 |
| **Total** | **$20-25/month** |

---

## Infrastructure Decision: Why EC2 over Lambda

**Lambda NOT Recommended due to blocking issues:**
1. API Gateway timeout: 29 seconds max - LLM processing takes 30-60+ seconds
2. LibreOffice: Doesn't fit in Lambda layers (500MB limit)
3. SSE streaming: API Gateway doesn't support Server-Sent Events
4. Background tasks: Lambda dies after response

**EC2 Advantages:**
1. Full Linux server - can host multiple services
2. No timeout limits for long-running LLM calls
3. Docker works natively with LibreOffice
4. t3.micro free tier (first year) or t3.small ~$15/month
5. Future-proof: can add other company services to same instance

---

## Implementation Plan

### Milestone I1: EC2 Instance Setup

**Goal:** Provision and configure AWS EC2 instance with SSH access.

**Work:**
1. Launch EC2 via AWS Console:
   - AMI: Ubuntu Server 24.04 LTS
   - Instance type: t3.micro (free tier)
   - Storage: 20GB gp3
   - Key pair: Create `learning-system-key.pem`

2. Configure Security Group inbound rules:
   | Port | Source | Purpose |
   |------|--------|---------|
   | 22 | Your IP | SSH |
   | 80 | 0.0.0.0/0 | HTTP (redirect to HTTPS) |
   | 443 | 0.0.0.0/0 | HTTPS |
   | 8001 | 0.0.0.0/0 | Direct API (dev only) |

3. Allocate Elastic IP (if using custom domain)

4. Setup SSH config:
   ```
   Host learning-prod
       HostName <EC2-PUBLIC-IP>
       User ubuntu
       IdentityFile ~/.ssh/learning-system-key.pem
   ```

5. Initial server setup:
   ```bash
   sudo apt update && sudo apt upgrade -y
   # Install Docker, nginx, certbot
   ```

**Verification:** Can SSH to instance, Docker runs hello-world.

---

### Milestone I2: Docker Configuration

**Goal:** Containerize FastAPI backend with LibreOffice support.

**Work:**

1. Create `learn_system/Dockerfile`:
   ```dockerfile
   FROM python:3.11-slim

   ENV PYTHONDONTWRITEBYTECODE=1
   ENV PYTHONUNBUFFERED=1

   WORKDIR /app

   # Install LibreOffice for PPTX conversion
   RUN apt-get update && apt-get install -y --no-install-recommends \
       libreoffice-impress \
       fonts-liberation \
       fonts-dejavu-core \
       curl \
       && rm -rf /var/lib/apt/lists/*

   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt

   COPY . .

   RUN useradd --create-home appuser && chown -R appuser:appuser /app
   USER appuser

   EXPOSE 8001

   HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
       CMD curl -f http://localhost:8001/api/health || exit 1

   CMD ["uvicorn", "app.api.server:app", "--host", "0.0.0.0", "--port", "8001"]
   ```

2. Create `learn_system/docker-compose.yml`:
   ```yaml
   version: '3.8'

   services:
     api:
       build: .
       container_name: learning-system-api
       ports:
         - "8001:8001"
       env_file:
         - .env
       environment:
         - ENVIRONMENT=production
       restart: unless-stopped
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:8001/api/health"]
         interval: 30s
         timeout: 10s
         retries: 3
       logging:
         driver: "json-file"
         options:
           max-size: "50m"
           max-file: "5"
   ```

3. Create `learn_system/.dockerignore`:
   ```
   .git
   __pycache__
   *.pyc
   .env
   .env.*
   !.env.template
   tests
   *.md
   ```

4. Deploy to EC2:
   ```bash
   git clone <repo> /home/ubuntu/app
   cd /home/ubuntu/app/learn_system
   # Create .env with production values
   docker compose up -d --build
   ```

**Verification:** `curl http://localhost:8001/api/health` returns `{"status":"healthy"}`.

**Image Size:** ~700-850MB (LibreOffice is ~400-500MB)

---

### Milestone I3: Nginx Reverse Proxy + SSL

**Goal:** Configure Nginx as reverse proxy with Let's Encrypt SSL.

**Work:**

1. Create `/etc/nginx/sites-available/learning-api`:
   ```nginx
   # Rate limiting
   limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

   upstream fastapi_backend {
       server 127.0.0.1:8001;
       keepalive 32;
   }

   # HTTP -> HTTPS redirect
   server {
       listen 80;
       server_name api.yourdomain.com;

       location /.well-known/acme-challenge/ {
           root /var/www/certbot;
       }

       location / {
           return 301 https://$host$request_uri;
       }
   }

   # HTTPS server
   server {
       listen 443 ssl http2;
       server_name api.yourdomain.com;

       # SSL (configured by certbot)
       ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

       # Security headers
       add_header X-Frame-Options "DENY" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header Strict-Transport-Security "max-age=31536000" always;

       client_max_body_size 50M;

       # Upload endpoint (long timeout for LLM processing)
       location /api/sources/upload {
           limit_req zone=api_limit burst=5 nodelay;
           proxy_pass http://fastapi_backend;
           proxy_read_timeout 300s;
           proxy_send_timeout 300s;
       }

       # SSE streaming endpoint
       location /api/ai/chat/stream {
           proxy_pass http://fastapi_backend;
           proxy_set_header Connection '';
           proxy_buffering off;
           proxy_cache off;
           chunked_transfer_encoding off;
           proxy_read_timeout 300s;
       }

       # All other API endpoints
       location /api/ {
           limit_req zone=api_limit burst=20 nodelay;
           proxy_pass http://fastapi_backend;
           proxy_read_timeout 120s;
       }
   }
   ```

2. Enable site and get SSL:
   ```bash
   sudo ln -s /etc/nginx/sites-available/learning-api /etc/nginx/sites-enabled/
   sudo certbot --nginx -d api.yourdomain.com
   sudo systemctl reload nginx
   ```

**Key Timeout Settings:**
- Upload endpoint: 300s (PPTX conversion + LLM processing)
- AI chat endpoint: 120s (LLM calls)
- SSE streaming: 300s with buffering disabled

**Verification:** `curl -I https://api.yourdomain.com/api/health` returns 200 with SSL.

---

### Milestone I4: Netlify Frontend Deployment

**Goal:** Deploy React SPA to Netlify with proper configuration.

**Work:**

1. Create `web/netlify.toml`:
   ```toml
   [build]
     base = "web"
     command = "npm run build"
     publish = "dist"

   # SPA routing
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200

   # Cache hashed assets
   [[headers]]
     for = "/assets/*"
     [headers.values]
       Cache-Control = "public, max-age=31536000, immutable"

   # Security headers
   [[headers]]
     for = "/*"
     [headers.values]
       X-Frame-Options = "DENY"
       X-Content-Type-Options = "nosniff"

   [context.production.environment]
     VITE_API_URL = "https://api.yourdomain.com/api"
     NODE_VERSION = "20"
   ```

2. Netlify Dashboard Setup:
   - Create site: Add new site > Import from Git
   - Build settings: Base=`web`, Build=`npm run build`, Publish=`web/dist`

3. Environment Variables (Site settings > Environment variables):
   | Variable | Value |
   |----------|-------|
   | `VITE_SUPABASE_URL` | `https://xxx.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` |
   | `VITE_API_URL` | `https://api.yourdomain.com/api` |

**Verification:** Frontend loads at Netlify URL, can login, sources page shows data.

---

## Credentials Reference

**CRITICAL: Never store credentials in git.**

| Credential | Storage Location | How to Get |
|------------|------------------|------------|
| Supabase URL | `.env`, Netlify vars | Supabase Dashboard > Settings > API |
| Supabase Anon Key | `.env`, Netlify vars | Supabase Dashboard > Settings > API |
| Supabase Service Role Key | EC2 `.env` only | Supabase Dashboard > Settings > API |
| Anthropic API Key | EC2 `.env` | console.anthropic.com |
| Groq API Key | EC2 `.env` | console.groq.com |
| EC2 SSH Key | `~/.ssh/` local | AWS Console (during EC2 launch) |

### Backend .env Template (EC2 only)

```bash
ENVIRONMENT=production
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
ANTHROPIC_API_KEY="sk-ant-..."
GROQ_API_KEY="gsk_..."
CORS_ORIGINS="https://your-app.netlify.app"
```

---

## Operational Procedures

### Deploy Backend Updates

```bash
ssh learning-prod
cd /home/ubuntu/app
git pull
cd learn_system
docker compose down
docker compose up -d --build
curl http://localhost:8001/api/health
```

### Rollback Backend

```bash
ssh learning-prod
cd /home/ubuntu/app
git log --oneline -10  # Find previous commit
git checkout <previous-commit>
cd learn_system
docker compose down
docker compose up -d --build
```

### Rollback Frontend (Netlify)

1. Netlify Dashboard > Site > Deploys
2. Click previous successful deploy
3. Click "Publish deploy"

### View Logs

```bash
# Backend logs
ssh learning-prod
docker compose -f /home/ubuntu/app/learn_system/docker-compose.yml logs -f --tail=100

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Renewal

```bash
# Certbot auto-renews via systemd timer
sudo systemctl status certbot.timer

# Force renewal if needed
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

---

## Troubleshooting Guide

### API Returns 502 Bad Gateway

1. Check container: `docker compose ps`
2. Check logs: `docker compose logs --tail=50`
3. Restart: `docker compose restart`

### CORS Errors

1. Verify `CORS_ORIGINS` in backend `.env` matches frontend domain exactly
2. Verify `VITE_API_URL` in Netlify matches backend domain exactly
3. Restart container after `.env` changes

### SSL Certificate Expired

```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Container Won't Start

```bash
docker compose logs --tail=100
# Common issues:
# - Missing .env file
# - Port 8001 already in use: sudo lsof -i :8001
# - Out of disk space: df -h
```

---

## Deployment Checklist

### Before Going Live

- [ ] EC2 instance launched (t3.micro, Ubuntu 24.04)
- [ ] SSH key secured (`chmod 400`)
- [ ] Docker installed and tested
- [ ] Dockerfile and docker-compose.yml created
- [ ] Backend deployed and responding at `:8001`
- [ ] Domain DNS pointed to Elastic IP
- [ ] Nginx configured as reverse proxy
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] HTTPS working: `curl https://api.yourdomain.com/api/health`
- [ ] netlify.toml created
- [ ] Netlify site created and linked to repo
- [ ] Environment variables set in Netlify
- [ ] Frontend deployed and accessible
- [ ] End-to-end test: login, upload, study

### Week 1 Post-Launch

- [ ] Uptime monitoring configured (UptimeRobot)
- [ ] Billing alerts set ($15)
- [ ] Backup procedure documented

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `learn_system/Dockerfile` | Create | Backend container definition |
| `learn_system/docker-compose.yml` | Create | Container orchestration |
| `learn_system/.dockerignore` | Create | Build optimization |
| `learn_system/.env` | Create (on EC2) | Production secrets |
| `web/netlify.toml` | Create | Frontend deployment config |
| `/etc/nginx/sites-available/learning-api` | Create (on EC2) | Reverse proxy |
| `INFRA.md` | Create | Full deployment documentation |

---

## Integration with EXECPLAN.md

Add to Progress section:
```
**Infrastructure Deployment (I1-I4)** - See `INFRA.md`
- [ ] I1: EC2 instance setup + security groups
- [ ] I2: Docker + docker-compose configuration
- [ ] I3: Nginx reverse proxy + SSL (Let's Encrypt)
- [ ] I4: Netlify frontend deployment
```

Add to Milestones section:
```
### Infrastructure Deployment I1-I4 (Ready)

**Full specs:** `INFRA.md`

Deploy to production: EC2 (backend) + Netlify (frontend) + Supabase (database).
- I1: EC2 setup, security groups, SSH
- I2: Docker, docker-compose, LibreOffice container
- I3: Nginx reverse proxy, SSL/TLS with Let's Encrypt, long-timeout handling
- I4: Netlify config, environment variables, deploy previews

**Cost:** $1-18/month (mostly Claude API)
```

---

## Research Sources

This consolidated plan draws from:

1. **PRODUCTION DEPLOYMENT RESEARCH.md** - Original 6-agent research covering backend infrastructure, database security, API security, frontend hosting, DevOps/CI/CD, cost optimization

2. **infra/ec2-setup worktree** - Detailed EC2 launch steps, security group configuration, SSH patterns, instance sizing guidance

3. **infra/docker-config worktree** - Dockerfile optimization, docker-compose configuration, LibreOffice integration, container networking

4. **infra/nginx-ssl worktree** - Nginx reverse proxy configuration, SSL/TLS with Let's Encrypt, long-running request handling, SSE streaming support

5. **infra/netlify-frontend worktree** - netlify.toml configuration, environment variables, deploy previews, custom domain setup

6. **infra/deployment-docs worktree** - INFRA.md structure, credential management documentation, runbook format, deployment checklists

7. **infra/system-integration worktree** - Systemd services, deployment scripts, health checks, monitoring setup, emergency procedures
