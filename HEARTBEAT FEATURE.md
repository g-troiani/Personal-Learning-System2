# Supabase Heartbeat Feature

Prevents Supabase free tier project pause (7 days of inactivity threshold).

---

## Consolidated Implementation Plan

**Status:** Ready for implementation
**Complexity:** Low (single YAML file, no code changes)
**Estimated effort:** 15 minutes

### Executive Summary

Supabase free tier pauses projects after 7 days of inactivity. This feature adds a GitHub Actions workflow that pings the database every 3 days to prevent suspension.

### Architecture Decision

| Option | Recommended | Rationale |
|--------|-------------|-----------|
| **GitHub Actions** | ✅ Primary | Independent of EC2, zero code changes, free tier sufficient |
| EC2 Backend | ❌ Rejected | Single point of failure (EC2 down = heartbeat stops) |
| Netlify Functions | ❌ Rejected | Adds complexity to frontend codebase |

### Implementation

**Single file to create:** `.github/workflows/supabase-heartbeat.yml`

```yaml
name: Supabase Heartbeat

on:
  schedule:
    # Every 3 days at 03:00 UTC (4-day buffer before 7-day pause)
    - cron: '0 3 */3 * *'
  workflow_dispatch: {}  # Manual trigger for testing

jobs:
  heartbeat:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase Database
        run: |
          echo "[HEARTBEAT] $(date -u '+%Y-%m-%dT%H:%M:%SZ') Pinging Supabase..."

          response=$(curl -s -w "\n%{http_code}" \
            "${{ secrets.SUPABASE_URL }}/rest/v1/technique_bundles?select=id&limit=1" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}")

          http_code=$(echo "$response" | tail -n1)

          if [ "$http_code" = "200" ]; then
            echo "[HEARTBEAT] $(date -u '+%Y-%m-%dT%H:%M:%SZ') status=success http_code=$http_code"
          else
            echo "[HEARTBEAT] $(date -u '+%Y-%m-%dT%H:%M:%SZ') status=error http_code=$http_code"
            exit 1
          fi
```

### Setup Steps

1. **Add GitHub Secrets** (Settings → Secrets → Actions):
   - `SUPABASE_URL`: `https://xxx.supabase.co`
   - `SUPABASE_ANON_KEY`: `eyJhbG...` (from Supabase Dashboard → API → Legacy tab)

2. **Create workflow file:**
   ```bash
   mkdir -p .github/workflows
   # Create supabase-heartbeat.yml with content above
   git add .github/workflows/supabase-heartbeat.yml
   git commit -m "feat(heartbeat): Add Supabase keep-alive workflow"
   git push
   ```

3. **Verify:**
   - Go to Actions tab in GitHub
   - Click "Supabase Heartbeat" → "Run workflow" → "Run workflow"
   - Confirm green checkmark

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Scheduler** | GitHub Actions | Independent of EC2, highly reliable, free |
| **Frequency** | Every 3 days | 4-day buffer before 7-day pause threshold |
| **Time** | 03:00 UTC | Off-peak, consistent timezone |
| **Table** | `technique_bundles` | Has public RLS policy, always has data (5 system bundles) |
| **Auth** | Anon key | Sufficient for read-only ping, safe to store in secrets |
| **Alerting** | GitHub email | Built-in failure notifications, no setup needed |

### Monitoring

| Task | How |
|------|-----|
| Verify running | GitHub → Actions → Supabase Heartbeat → see run history |
| Check failures | GitHub sends email on workflow failure (enable in notification settings) |
| Manual trigger | Actions → Supabase Heartbeat → "Run workflow" button |

### Cost

- **GitHub Actions:** ~1 minute per run × 10 runs/month = 10 minutes
- **Free tier:** 2,000 minutes/month for private repos
- **Usage:** 0.5% of allocation

### Rollback

To disable heartbeat: Delete `.github/workflows/supabase-heartbeat.yml` or rename to `.yml.disabled`

### Why This Works

1. `technique_bundles` table has RLS policy: `user_id IS NULL OR auth.uid() = user_id`
2. System bundles have `user_id = NULL`, so anon key can read them
3. Any successful API request to Supabase resets the 7-day inactivity timer
4. GitHub Actions runs independently of your infrastructure

---

# Research Details

The sections below contain the detailed research that informed the implementation plan above.

---

## 1. Infrastructure Options Analysis

**Context:** Supabase free tier pauses projects after 7 days of inactivity. Need a reliable heartbeat mechanism to prevent suspension.

**Current Infrastructure:**
- Frontend: Netlify (free tier)
- Backend: AWS EC2 t3.micro with Docker (FastAPI + LibreOffice)
- Database: Supabase (free tier)

### Option Comparison

| Option | Setup Complexity | Reliability | Cost | Maintenance |
|--------|------------------|-------------|------|-------------|
| **EC2 Cron Job** | Low | Medium | $0 | Medium |
| **GitHub Actions** | Low | High | $0 | Low |
| **Netlify Scheduled Functions** | Medium | High | $0 | Low |

---

### Option 1: EC2 Cron Job

**How it works:** Add a cron job to the existing EC2 instance that runs a simple database query (e.g., `SELECT 1`) every 3-5 days.

**Pros:**
- No new infrastructure needed - uses existing EC2 instance
- Zero additional cost
- Full control over timing and implementation
- Can be added as part of Docker container or host system

**Cons:**
- **Single point of failure:** If EC2 is stopped (cost savings, maintenance, outage), heartbeat stops
- EC2 must run 24/7 to be reliable - defeats t3.micro cost optimization
- Requires SSH access to modify cron configuration
- Resource impact minimal on t3.micro (curl + simple query = negligible CPU/memory)

**If EC2 is stopped:**
- Heartbeat immediately stops
- If EC2 is down for 7+ days, Supabase project will pause
- Need manual intervention to restart both EC2 and potentially unpause Supabase

**Implementation:**
```bash
# On EC2, add to crontab or docker-compose
# Run every 3 days at 3:00 AM UTC
0 3 */3 * * curl -s https://xxx.supabase.co/rest/v1/rpc/ping -H "apikey: $SUPABASE_ANON_KEY" > /dev/null
```

**Verdict:** Not recommended as primary solution due to EC2 dependency.

---

### Option 2: GitHub Actions (RECOMMENDED)

**How it works:** Create a scheduled GitHub Actions workflow that runs a simple Supabase query on a recurring schedule.

**Pros:**
- **Independent of EC2:** Runs regardless of backend status
- **Highly reliable:** GitHub Actions infrastructure is enterprise-grade
- **Free tier is generous:** 2,000 minutes/month for private repos; workflow uses ~1 minute per run
- **Easy secrets management:** GitHub Secrets for Supabase credentials
- **Low maintenance:** Set and forget
- No new accounts or services needed (already using GitHub)

**Cons:**
- Requires Supabase credentials stored in GitHub Secrets
- GitHub Actions has occasional outages (rare, but possible)
- Workflow auto-disables after 60 days of no repo activity (can re-enable)

**Free Tier Analysis:**
- Each heartbeat run: ~1 minute
- Running 2x per week: 8 minutes/month
- Free tier: 2,000 minutes/month for private repos
- **Usage: 0.4% of monthly allocation**

**Secrets Required:**

| Secret Name | Value | Source |
|-------------|-------|--------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | Supabase Dashboard |
| `SUPABASE_ANON_KEY` | `eyJhbG...` (legacy format) | Supabase Dashboard > API > Legacy tab |

**Implementation:**

Create `.github/workflows/supabase-heartbeat.yml`:
```yaml
name: Supabase Heartbeat

on:
  schedule:
    # Run every 3 days at 3:00 AM UTC
    - cron: '0 3 */3 * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  heartbeat:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase Database
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" \
            "${{ secrets.SUPABASE_URL }}/rest/v1/" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}")

          if [ "$response" -eq 200 ]; then
            echo "Heartbeat successful: HTTP $response"
          else
            echo "Heartbeat failed: HTTP $response"
            exit 1
          fi

      - name: Log Timestamp
        run: echo "Heartbeat completed at $(date -u)"
```

**Verdict:** Recommended. Independent, reliable, free, low-maintenance.

---

### Option 3: Netlify Scheduled Functions

**How it works:** Create a Netlify serverless function that runs on a schedule to ping Supabase.

**Pros:**
- Uses existing Netlify infrastructure
- Integrated with frontend deployment
- Good documentation and developer experience

**Cons:**
- **Counts against function invocation limit:** 125,000/month shared with all functions
- 30-second execution timeout (sufficient for heartbeat)
- Only runs on published deploys (not previews)
- Requires Netlify-specific function format
- Adds complexity to frontend codebase

**Free Tier Analysis:**
- Each invocation: ~1 count
- Running 2x per week: 8 invocations/month
- Free tier: 125,000 invocations/month
- **Usage: 0.006% of monthly allocation**
- However, this limit is shared with production API proxy and any future functions

**Configuration:**

`netlify.toml` addition:
```toml
[functions]
  directory = "netlify/functions"

[[edge_functions]]
  function = "supabase-heartbeat"
  schedule = "@daily"
```

Create `netlify/functions/supabase-heartbeat.js`:
```javascript
export default async () => {
  const response = await fetch(process.env.SUPABASE_URL + '/rest/v1/', {
    headers: {
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
    }
  });

  return new Response(
    JSON.stringify({ status: response.ok ? 'ok' : 'failed', timestamp: new Date().toISOString() }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};

export const config = {
  schedule: "@daily"
};
```

**Verdict:** Viable but adds complexity. GitHub Actions is simpler for this use case.

---

### Final Recommendation: GitHub Actions

**Why GitHub Actions is the best choice:**

1. **Independence:** Works even if EC2 is stopped for cost savings or maintenance
2. **Reliability:** GitHub's infrastructure is highly available
3. **Simplicity:** Single YAML file, no code changes to existing codebase
4. **Cost:** Well within free tier (uses 0.4% of allocation)
5. **Maintenance:** Minimal - just check workflow runs occasionally
6. **Existing tooling:** Already using GitHub for version control

**Implementation Priority:**
1. Create `.github/workflows/supabase-heartbeat.yml`
2. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to GitHub repository secrets
3. Manually trigger workflow once to verify
4. Monitor first few automated runs

**Fallback Strategy:**
If GitHub Actions becomes unreliable or pricing changes affect free tier:
- Netlify Scheduled Functions as backup (already have infrastructure)
- EC2 cron as tertiary option (if EC2 runs continuously)

---

### Sources

- [Supabase Pause Prevention GitHub Project](https://github.com/travisvn/supabase-pause-prevention)
- [Prevent Supabase Free Tier Pausing (2026 Guide)](https://shadhujan.medium.com/how-to-keep-supabase-free-tier-projects-active-d60fd4a17263)
- [Prevent Supabase project from pausing with GitHub Actions](https://natt.sh/blog/2024-03-17-supabase-activity-scheduler)
- [GitHub Actions Billing and Usage](https://docs.github.com/en/actions/concepts/billing-and-usage)
- [GitHub Actions Limits](https://docs.github.com/en/actions/reference/limits)
- [Netlify Scheduled Functions Documentation](https://docs.netlify.com/build/functions/scheduled-functions/)
- [Netlify Functions Usage and Billing](https://docs.netlify.com/build/functions/usage-and-billing/)
- [Netlify Pricing](https://www.netlify.com/pricing/)

---

## 2. Database Query & RLS Design

### Summary

The optimal heartbeat query uses the `technique_bundles` table with the anon key. This table contains system-level records (where `user_id IS NULL`) that are readable by all users via RLS policy, making it ideal for unauthenticated heartbeat checks.

### Analysis

#### 1. Query Selection

**Recommended Query:** `SELECT id FROM technique_bundles LIMIT 1`

| Query Type | Activity Proof | Performance | Risk |
|------------|----------------|-------------|------|
| `SELECT 1` (no table) | NO - pure function | Fastest | Does not hit storage |
| `SELECT id FROM table LIMIT 1` | YES | Fast | Read-only, safe |
| `SELECT COUNT(*)` | YES | Slower (full scan) | Overkill for heartbeat |
| `INSERT/UPDATE` | YES | Medium | Modifies data, risky |

**Why technique_bundles:**
- Contains 5 pre-seeded system bundles (user_id IS NULL)
- Always has data - never empty
- RLS policy allows SELECT for system bundles: `user_id IS NULL OR auth.uid() = user_id`
- Small table (5 rows), fast query
- Read-only access sufficient

#### 2. RLS Considerations

**Use anon key (not service role):**
- RLS policy on technique_bundles allows reading system bundles without authentication
- No need to bypass RLS - the query works through normal RLS policies
- Avoids exposing service role key in frontend code
- Heartbeat doesn't need to access user-specific data

**What if table is empty?**
- technique_bundles is pre-seeded with 5 system bundles during setup
- Query still succeeds (returns 0 rows) - connection was made
- Empty result still proves database activity

**RLS Policy (from m45_rls_policies.sql lines 321-339):**
```sql
CREATE POLICY "Users can view system and own technique bundles"
    ON technique_bundles FOR SELECT
    USING (user_id IS NULL OR auth.uid() = user_id);
```

This allows reading rows where `user_id IS NULL` even without authentication.

#### 3. Implementation Code

**Frontend (Supabase-js):**
```javascript
// In web/src/lib/supabase.js or a dedicated heartbeat module
import { supabase } from './supabase'

export async function heartbeat() {
  try {
    const { data, error } = await supabase
      .from('technique_bundles')
      .select('id')
      .limit(1)

    if (error) throw error
    return { success: true, timestamp: new Date().toISOString() }
  } catch (error) {
    console.error('Heartbeat failed:', error)
    return { success: false, error: error.message }
  }
}
```

**Alternative: Use Supabase RPC for minimal overhead:**
```sql
-- Create in Supabase SQL Editor (optional, for absolute minimum overhead)
CREATE OR REPLACE FUNCTION heartbeat()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT true;
$$;

-- Grant access to anon and authenticated roles
GRANT EXECUTE ON FUNCTION heartbeat() TO anon, authenticated;
```

```javascript
// Frontend usage
const { data, error } = await supabase.rpc('heartbeat')
```

**Backend (Python with supabase-py):**
```python
# For backend-triggered heartbeat if needed
from app.database.connection import get_supabase_client

def heartbeat():
    """Ping database to prevent project suspension."""
    client = get_supabase_client()
    result = client.table('technique_bundles').select('id').limit(1).execute()
    return len(result.data) >= 0  # True even if empty
```

#### 4. Authentication Approach

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| Anon key | No auth needed, simpler | Limited to public data | **RECOMMENDED** |
| User session token | Full access | Requires logged-in user | Not for cron jobs |
| Service role key | Bypasses RLS | Security risk if exposed | Backend only |

**Decision: Use anon key from GitHub Actions**
- Heartbeat runs regardless of user login state
- technique_bundles system rows are public via RLS
- No secrets beyond the anon key (which is already public)

#### 5. Alternative Tables Considered

| Table | Always Has Data? | Anon-Readable? | Verdict |
|-------|------------------|----------------|---------|
| technique_bundles | Yes (5 system rows) | Yes (user_id IS NULL) | **Best choice** |
| content_sources | Maybe empty | No (user_id required) | Rejected |
| sessions | Maybe empty | No (user_id required) | Rejected |
| attempts | Maybe empty | No (user_id required) | Rejected |
| auth.users | Yes | No (system table) | Rejected |

#### 6. Key Files Reference

- **Supabase client:** `web/src/lib/supabase.js`
- **RLS policies:** `migrations/m45_rls_policies.sql` (lines 321-339 for technique_bundles)
- **Table schema:** `.claude/memory/schemas/database.md`
- **System bundles seed:** `.claude/memory/schemas/database.md` (lines 237-251)

### Conclusion

Use `supabase.from('technique_bundles').select('id').limit(1)` with the anon key. This:
1. Proves database activity (actual table query)
2. Works without authentication (system rows are public)
3. Is read-only and safe
4. Will always succeed (table always has data)
5. Is fast (single row from small table)

---

## 3. Scheduling and Reliability

### Timing Strategy

**Recommended frequency: Every 3 days (72 hours)**

| Frequency | Pros | Cons | Verdict |
|-----------|------|------|---------|
| Daily | Maximum safety margin (7 days buffer) | Unnecessary; wastes CI minutes | Overkill |
| Every 3 days | 4-day buffer before pause; catches failures early | Slightly more CI usage | **Recommended** |
| Every 5 days | Minimal CI usage | Only 2-day buffer; risky | Too tight |
| Every 6 days | Very minimal CI usage | 1-day buffer; single failure = pause | Dangerous |

**Why 3 days:**
- Provides 2 retry opportunities before the 7-day threshold
- If Monday's heartbeat fails, Wednesday's runs; if that fails, Friday's runs
- Final fallback: manual intervention still has 1-2 days buffer

**Time of day: 03:00 UTC (off-peak)**
- Avoids peak Supabase/GitHub load
- Translates to: 10:00 PM EST, 7:00 PM PST, 4:00 AM CET
- Consistent regardless of server/runner timezone

---

### Cron Expressions

**Primary schedule (every 3 days at 03:00 UTC):**

```
# Standard cron (5-field)
0 3 */3 * *
```

| Field | Value | Meaning |
|-------|-------|---------|
| minute | 0 | At minute 0 |
| hour | 3 | At 03:00 UTC |
| day | */3 | Every 3rd day of month |
| month | * | Every month |
| weekday | * | Any day of week |

**Platform-specific examples:**

**GitHub Actions (`/.github/workflows/heartbeat.yml`):**
```yaml
on:
  schedule:
    - cron: '0 3 */3 * *'  # Every 3 days at 03:00 UTC
  workflow_dispatch: {}     # Manual trigger for testing
```

**EC2 crontab (`crontab -e`):**
```bash
# Supabase heartbeat - every 3 days at 03:00 UTC
0 3 */3 * * /home/ubuntu/app/scripts/heartbeat.sh >> /home/ubuntu/logs/heartbeat.log 2>&1
```

**Systemd timer (`/etc/systemd/system/heartbeat.timer`):**
```ini
[Unit]
Description=Supabase Heartbeat Timer

[Timer]
OnCalendar=*-*-1,4,7,10,13,16,19,22,25,28,31 03:00:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
```

---

### Reliability and Retry Strategy

**Failure modes and mitigations:**

| Failure | Detection | Mitigation |
|---------|-----------|------------|
| Network timeout | HTTP status != 200 | Retry 3x with exponential backoff |
| Supabase outage | HTTP 5xx | Retry after 30min; log for review |
| Invalid credentials | HTTP 401/403 | Alert immediately; no retry |
| DNS resolution | Connection refused | Retry 3x; check EC2 networking |
| Clock drift | N/A (uses UTC) | Systemd/chrony handles sync |

**Retry logic (pseudocode):**
```python
MAX_RETRIES = 3
BACKOFF_BASE = 30  # seconds

for attempt in range(MAX_RETRIES):
    response = heartbeat_request()
    if response.status == 200:
        log_success()
        exit(0)

    if response.status in [401, 403]:
        alert_critical("Auth failure - check credentials")
        exit(1)

    delay = BACKOFF_BASE * (2 ** attempt)  # 30s, 60s, 120s
    log_warning(f"Attempt {attempt+1} failed, retrying in {delay}s")
    sleep(delay)

# All retries exhausted
alert_warning("Heartbeat failed after 3 attempts")
exit(1)
```

**Alert thresholds:**

| Condition | Action |
|-----------|--------|
| Single failure with successful retry | Log only |
| 2 consecutive failures | Warning notification |
| 3 consecutive failures (same run) | Alert; schedule immediate retry |
| 2 consecutive scheduled runs fail | Critical alert; manual intervention |

---

### Edge Cases

**Network timeouts:**
- Set HTTP timeout to 30 seconds (Supabase API is fast)
- If timeout, treat as failure and retry
- GitHub Actions has built-in timeout support: `timeout-minutes: 5`

**Supabase temporary outages:**
- Supabase status page: https://status.supabase.com
- During planned maintenance, heartbeat may fail
- 3-day schedule provides buffer for 1-2 day outages
- Consider subscribing to Supabase status RSS/webhook

**Clock drift on EC2:**
- EC2 instances sync with AWS NTP automatically
- Verify: `timedatectl status` should show NTP synchronized
- If using crontab, times are in server timezone (set to UTC recommended)
- Systemd timers can specify UTC explicitly

**GitHub Actions scheduling caveats:**
- Scheduled workflows may be delayed up to 15 minutes during high load
- Scheduled workflows are disabled after 60 days of repo inactivity
- Push a commit or manually trigger workflow to re-enable
- Not guaranteed during GitHub outages

---

### Recommended Implementation: GitHub Actions

**Why GitHub Actions over EC2 crontab:**
- No EC2 dependency (works even if EC2 is down)
- Built-in retry, logging, and notifications
- Free for public repos; generous free tier for private
- Workflow history visible in GitHub UI

**Fallback strategy:**
1. **Primary:** GitHub Actions (every 3 days)
2. **Secondary:** EC2 crontab (every 4 days, offset by 2 days)
3. **Tertiary:** Manual run if both fail alerts

This redundancy ensures the Supabase project never pauses due to a single point of failure.

---

### Monitoring and Alerting

**Success verification:**
- Log timestamp of each successful heartbeat
- Query Supabase to verify project status is active
- GitHub Actions: Check workflow run history

**Alert channels (priority order):**
1. GitHub Actions failure notification (built-in)
2. Email via GitHub notification settings
3. Slack/Discord webhook (optional)
4. SMS via Twilio (critical only)

**Health check endpoint to add to FastAPI:**
```python
@app.get("/api/health/supabase")
async def supabase_health():
    """Check Supabase connectivity - also serves as heartbeat."""
    try:
        result = supabase.table("content_sources").select("id").limit(1).execute()
        return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )
```

---

### Summary

| Parameter | Value |
|-----------|-------|
| **Frequency** | Every 3 days |
| **Time** | 03:00 UTC |
| **Cron expression** | `0 3 */3 * *` |
| **Primary scheduler** | GitHub Actions |
| **Retry attempts** | 3 with exponential backoff |
| **HTTP timeout** | 30 seconds |
| **Alert on** | 2+ consecutive failures |
| **Buffer before pause** | 4 days minimum |

---

## 4. Monitoring & Observability

### Purpose

Minimal observability for the Supabase heartbeat feature. Goal: verify heartbeat is running without building complex monitoring infrastructure.

### Design Philosophy

This is a keep-alive mechanism, not a monitoring system. Keep it simple:
- Logs should be sufficient for debugging
- Manual verification should be easy
- Alerting is optional (GitHub Actions provides built-in failure notifications)

---

### 4.1 Logging Strategy

#### Where to Log

**Recommended: stdout (Docker captures automatically)**

The Docker container already captures stdout to json-file logs (see `learn_system/docker-compose.yml` lines 19-23). No additional configuration needed.

```yaml
# Already configured in docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "50m"
    max-file: "5"
```

**Access logs:**
```bash
ssh learning-prod
docker compose -f /home/ubuntu/app/learn_system/docker-compose.yml logs -f --tail=100 | grep heartbeat
```

#### What to Log

Log one line per heartbeat execution with these fields:

| Field | Example | Purpose |
|-------|---------|---------|
| timestamp | `2026-02-06T14:30:00Z` | When heartbeat ran |
| status | `success` / `error` | Quick scan for failures |
| response_ms | `127` | Performance baseline |
| tables_touched | `1` | Verify query executed |
| error | `null` / `"Connection timeout"` | Debug failures |

**Example log line:**
```
[HEARTBEAT] 2026-02-06T14:30:00Z status=success response_ms=127 tables_touched=1
[HEARTBEAT] 2026-02-06T14:30:00Z status=error response_ms=5000 error="Connection timeout"
```

#### Log Format

**Recommended: Structured plain text (not JSON)**

The codebase uses `print()` statements throughout (see `learn_system/app/` for examples). JSON logging would require adding a logging library (structlog, python-json-logger) which conflicts with the "minimal changes" principle.

Pattern to follow (consistent with existing code):
```python
from datetime import datetime, timezone

def log_heartbeat(success: bool, response_ms: int, error: str = None):
    ts = datetime.now(timezone.utc).isoformat()
    if success:
        print(f"[HEARTBEAT] {ts} status=success response_ms={response_ms}")
    else:
        print(f"[HEARTBEAT] {ts} status=error response_ms={response_ms} error=\"{error}\"")
```

---

### 4.2 Success Verification

#### Confirm Heartbeat Ran

**Option A: Check Docker logs (manual)**
```bash
ssh learning-prod
docker compose logs --since 1h | grep -c "\[HEARTBEAT\]"
# Should show number of heartbeats in last hour
```

**Option B: Check Supabase logs (if available)**
Supabase Dashboard > Logs > API logs - filter by the heartbeat table name

**Option C: Add heartbeat_log table (optional)**

If you want persistent verification, add a simple log table:

```sql
CREATE TABLE heartbeat_log (
    id SERIAL PRIMARY KEY,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN,
    response_ms INTEGER
);

-- Keep only last 7 days
CREATE INDEX idx_heartbeat_log_executed_at ON heartbeat_log(executed_at);
```

Query last 24 hours:
```sql
SELECT COUNT(*),
       COUNT(*) FILTER (WHERE success) as successful,
       AVG(response_ms) as avg_response_ms
FROM heartbeat_log
WHERE executed_at > NOW() - INTERVAL '24 hours';
```

**Recommended:** Start with Option A (logs only). Add Option C only if you need historical verification.

#### Verify Supabase Received Request

The heartbeat query itself confirms receipt. If Supabase rejects the request:
- Network error: Connection fails, heartbeat logs `error`
- Auth error: Supabase returns 401, heartbeat logs `error`
- RLS error: Query returns empty (acceptable - still prevents hibernation)

No additional verification needed beyond the heartbeat's own error handling.

---

### 4.3 Failure Alerting

#### Option 1: GitHub Actions (Recommended)

GitHub Actions has built-in failure notifications. If you run heartbeat as a scheduled workflow:

```yaml
# .github/workflows/supabase-heartbeat.yml
name: Supabase Heartbeat
on:
  schedule:
    - cron: '0 3 */3 * *'  # Every 3 days at 03:00 UTC
  workflow_dispatch: {}

jobs:
  heartbeat:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase
        run: |
          response=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            "${{ secrets.SUPABASE_URL }}/rest/v1/technique_bundles?select=id&limit=1")
          if [ "$response" != "200" ]; then
            echo "Heartbeat failed with status $response"
            exit 1
          fi
```

**Notification:** GitHub sends email on workflow failure by default. Enable in Settings > Notifications.

**Cost:** Free for public repos, 2000 minutes/month free for private repos.

#### Option 2: UptimeRobot (Free tier)

If you want external monitoring without code changes:

1. Create free account at uptimerobot.com
2. Add HTTP monitor for `https://your-api.com/api/health`
3. Configure email/Slack alerts on failure

**Limitation:** Monitors API health, not specifically heartbeat. But if API is up, heartbeat will run.

#### Option 3: EC2 Cron + Email (No external services)

Add simple email alerting using mailx on EC2:

```bash
# /home/ubuntu/heartbeat-check.sh
#!/bin/bash
HEARTBEAT_COUNT=$(docker compose logs --since 6h 2>/dev/null | grep -c "\[HEARTBEAT\].*success")
if [ "$HEARTBEAT_COUNT" -eq 0 ]; then
    echo "No successful heartbeats in last 6 hours" | mail -s "ALERT: Heartbeat Failed" your@email.com
fi
```

```bash
# Add to crontab
0 */6 * * * /home/ubuntu/heartbeat-check.sh
```

**Requirement:** Configure mailx with SMTP credentials (may require additional setup).

**Recommended:** Use GitHub Actions if you implement heartbeat there. Otherwise, rely on Docker logs + occasional manual checks. Full alerting adds complexity for minimal benefit on a keep-alive feature.

---

### 4.4 Manual Verification

#### Quick Health Check

```bash
# 1. SSH to EC2
ssh learning-prod

# 2. Check API is responding
curl http://localhost:8001/api/health
# Expected: {"status":"healthy","version":"1.0.0","timestamp":"..."}

# 3. Check heartbeat ran recently
docker compose logs --since 24h | grep "\[HEARTBEAT\]" | tail -5

# 4. Check for errors
docker compose logs --since 24h | grep "\[HEARTBEAT\].*error"
```

#### Where to Look for Logs

| Log Type | Location | Command |
|----------|----------|---------|
| Docker container | Captured by Docker | `docker compose logs --tail=100` |
| Nginx access | `/var/log/nginx/access.log` | `sudo tail -f /var/log/nginx/access.log` |
| Nginx error | `/var/log/nginx/error.log` | `sudo tail -f /var/log/nginx/error.log` |
| System | journald | `journalctl -u docker -f` |

#### Health Check Endpoint

The existing `/api/health` endpoint (see `learn_system/app/api/routes/health.py`) can be extended to include heartbeat status:

```python
# Optional enhancement to health.py
@router.get("/health", response_model=HealthResponse)
async def health_check():
    # Existing health check
    response = {
        "status": "healthy",
        "version": "1.0.0"
    }

    # Optional: Add last heartbeat time if tracking in DB
    # last_heartbeat = get_last_heartbeat_time()
    # response["last_heartbeat"] = last_heartbeat.isoformat() if last_heartbeat else None

    return response
```

**Recommended:** Keep health endpoint simple. Check heartbeat status via logs, not API.

---

### 4.5 Implementation Recommendations

#### Minimal Approach (Start Here)

1. **Log to stdout** - Docker already captures this
2. **Use `[HEARTBEAT]` prefix** - Easy to grep
3. **Include timestamp and status** - Sufficient for debugging
4. **Check logs manually** - `docker compose logs | grep HEARTBEAT`
5. **No external alerting** - Overkill for keep-alive

#### If Alerting is Needed Later

1. **GitHub Actions** - If heartbeat runs there (free, built-in notifications)
2. **UptimeRobot** - If you want API monitoring anyway (free tier)
3. **Skip EC2 cron/email** - Adds maintenance burden

#### Avoid Overengineering

Do NOT add:
- Prometheus/Grafana (way overkill)
- CloudWatch (costs money, adds complexity)
- Sentry (meant for errors, not heartbeats)
- PagerDuty (meant for on-call, not personal projects)
- Custom dashboards (logs are sufficient)

---

### 4.6 Summary

| Question | Answer |
|----------|--------|
| Where to log? | stdout (Docker captures automatically) |
| What to log? | `[HEARTBEAT] timestamp status=X response_ms=Y` |
| Log format? | Plain text with prefix (matches codebase) |
| How to verify success? | `docker compose logs \| grep HEARTBEAT` |
| Failure alerting? | GitHub Actions (if using) or manual checks |
| Health endpoint? | Use existing `/api/health`, don't extend |

**Total new code:** ~10 lines (one print statement per heartbeat execution)

**Dependencies:** None (uses existing Docker logging)

**Maintenance:** Near-zero (check logs if something breaks)

---

## 5. Security & Secrets Management

### Context

The Personal Learning System uses Supabase with two key types:
- **Anon key** (frontend): Safe to expose, subject to RLS policies
- **Service role key** (backend): Bypasses RLS, must NEVER be exposed

A heartbeat monitoring feature needs to authenticate requests to Supabase to verify database connectivity.

---

### Which Key to Use for Heartbeat?

**Recommendation: Use the ANON KEY**

| Key Type | Safe to Expose | RLS Applies | Appropriate for Heartbeat |
|----------|----------------|-------------|---------------------------|
| Anon key | Yes | Yes | YES - preferred |
| Service role key | NO | No | NO - overkill for read-only ping |

**Rationale:**
1. Heartbeat only needs to verify connectivity (e.g., `SELECT 1` or table count)
2. RLS doesn't block unauthenticated read queries that don't access user data
3. Service role key is dangerous if exposed in logs, error messages, or monitoring dashboards
4. The anon key is already exposed in the frontend browser code

**Simple heartbeat query (works with anon key):**
```sql
SELECT id FROM technique_bundles LIMIT 1
```
This works because `technique_bundles` has a permissive RLS policy allowing reads of system bundles (where `user_id IS NULL`).

---

### Secrets Storage by Platform

| Platform | Storage Method | Access Pattern |
|----------|---------------|----------------|
| EC2 Backend | `.env` file (already exists) | `os.getenv('SUPABASE_URL')` |
| GitHub Actions | Repository secrets | `${{ secrets.SUPABASE_URL }}` |
| Netlify | Environment variables (Dashboard) | Build-time only (VITE_ prefix) |
| External Monitoring (UptimeRobot, etc.) | Service-specific secrets vault | Per-service configuration |

**EC2 .env already contains (from `infrastructure_deployment.md`):**
```bash
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."  # Backend only - NEVER expose
```

**For heartbeat in GitHub Actions, add these secrets:**
```bash
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOi..."  # Safe to use for read-only checks
```

---

### Minimal Permissions Approach

**Option A: Use Existing Anon Key (Recommended)**
- Already available, no new key creation needed
- Safe to expose in monitoring dashboards
- Works for simple connectivity checks via RLS

**Option B: Create Limited-Scope Database Role (Overkill for heartbeat)**
Only needed if heartbeat requires custom permissions beyond RLS:
```sql
-- Create a read-only role for monitoring (NOT RECOMMENDED - adds complexity)
CREATE ROLE heartbeat_monitor WITH LOGIN PASSWORD 'xxx';
GRANT USAGE ON SCHEMA public TO heartbeat_monitor;
GRANT SELECT ON technique_bundles TO heartbeat_monitor;
-- No access to user data tables
```

**Recommendation:** Option A. The anon key is sufficient for heartbeat purposes.

---

### Security Best Practices

**1. Never Log Credentials**
```python
# WRONG - exposes key in logs
logger.info(f"Connecting to {supabase_url} with key {supabase_key}")

# CORRECT - only log non-sensitive info
logger.info(f"Connecting to Supabase at {supabase_url}")
```

**2. Key Rotation Protocol**
If a key is compromised:
1. Supabase Dashboard > Settings > API > Regenerate key
2. Update `.env` on EC2: `vim /home/ubuntu/app/learn_system/.env`
3. Restart container: `docker compose down && docker compose up -d`
4. Update Netlify env vars (if anon key changed)
5. Update GitHub secrets (if used in CI/CD)
6. Verify all services recover with `/api/health` endpoint

**3. Audit Access**
- Supabase Dashboard > Logs shows all API requests
- Filter by key type to see usage patterns
- Set up alerts for unusual request volumes

**4. Environment Separation**
```
Production:  SUPABASE_URL=https://xxx.supabase.co
Staging:     SUPABASE_URL=https://yyy.supabase.co (separate project)
Development: SUPABASE_URL=https://zzz.supabase.co (separate project)
```
Never use production keys in development or CI test runs.

---

### Implementation Recommendations

**For EC2 Backend Heartbeat Endpoint (extends existing `/api/health`):**
```python
# learn_system/app/api/routes/health.py
from ..database.connection import get_supabase_client
import time

@router.get("/health/db")
async def database_health():
    """Check database connectivity - uses existing backend Supabase client."""
    try:
        start = time.time()
        client = get_supabase_client()
        # Query system table (technique_bundles has public rows)
        result = client.table('technique_bundles').select('id').limit(1).execute()
        latency_ms = int((time.time() - start) * 1000)
        return {"database": "healthy", "latency_ms": latency_ms}
    except Exception as e:
        return {"database": "unhealthy", "error": str(e)}
```

**For GitHub Actions (primary heartbeat mechanism):**
```yaml
# .github/workflows/heartbeat.yml
name: Supabase Heartbeat

on:
  schedule:
    - cron: '0 3 */3 * *'  # Every 3 days at 03:00 UTC
  workflow_dispatch: {}     # Manual trigger

jobs:
  heartbeat:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          curl -s -X GET \
            "$SUPABASE_URL/rest/v1/technique_bundles?select=id&limit=1" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            --fail
```

**For External Monitoring (UptimeRobot/Better Stack):**
- Use the existing `/api/health` endpoint (no DB check) for basic uptime
- Use `/api/health/db` endpoint for deeper health checks
- Store Supabase anon key in the monitoring service's secrets vault only if needed for direct DB pings

---

### Key Insights from Project Memory

From **EXECPLAN.md "Surprises and Discoveries":**
- "Service role key bypasses RLS - use only server-side, never expose"
- "Never use API keys as access tokens - use `session.access_token`, not anon key" (for user auth)
- "Auth token stored in localStorage as `sb-{project-ref}-auth-token`"

From **auth_multiuser.md:**
- Service role key is used by backend to bypass RLS for admin operations
- Anon key is safe for frontend and unauthenticated read-only queries
- RLS policy on `technique_bundles`: `user_id IS NULL OR auth.uid() = user_id` allows reading system bundles without authentication

From **infrastructure_deployment.md:**
- EC2 `.env` contains: `SUPABASE_SERVICE_ROLE_KEY` (backend only)
- Netlify env vars contain: `VITE_SUPABASE_ANON_KEY` (frontend, safe to expose)

---

### Summary

| Question | Answer |
|----------|--------|
| Which key for heartbeat? | **Anon key** - safe, sufficient |
| Where to store? | EC2 `.env`, GitHub secrets, monitoring vault |
| Create custom key? | **No** - anon key sufficient |
| Service role key for heartbeat? | **NEVER** - bypasses RLS, dangerous if exposed |
| Best table for heartbeat query? | `technique_bundles` - always has data, public rows via RLS |

**Security principle:** Use the least-privilege key that accomplishes the task. For heartbeat (read-only connectivity check), the anon key is the right choice.

---

## 6. System Integration & Deployment

### Supabase Heartbeat - Integration Analysis

This section provides an implementation-ready analysis for deploying a Supabase connection heartbeat to prevent connection hibernation.

---

### 6.1 Deployment Method

**Recommendation: Add to existing backend, deploy with normal git pull workflow.**

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Part of existing backend | No new infrastructure, uses existing deploy workflow, shares config | Slightly larger container | **Selected** |
| Standalone cron job | Isolated, independent restart | New moving part, separate monitoring, duplicate Supabase config | Rejected |
| External service (AWS Lambda) | True serverless | Adds AWS complexity, 29s timeout (irrelevant for ping), extra cost | Rejected |

**Why existing backend:**
1. Already has Supabase connection (`learn_system/app/database/connection.py`)
2. Uses proven Docker + docker-compose deployment
3. Config already loaded from `.env` (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
4. Deployment is simple: `git pull && docker compose down && docker compose up -d --build`
5. No additional infrastructure or credentials to manage

**Minimal Disruption:**
- No new Docker containers
- No new environment variables
- No new dependencies (uses existing `supabase-py` client)
- No changes to Nginx or network config
- Deploy via existing "Deploy Backend Updates" procedure in EXECPLAN.md

---

### 6.2 File Organization

**Create one new file, modify two existing files.**

| File | Action | Purpose |
|------|--------|---------|
| `learn_system/app/services/heartbeat.py` | **Create** | Heartbeat logic, Supabase ping, logging |
| `learn_system/app/api/routes/health.py` | **Modify** | Add `/api/heartbeat/status` endpoint |
| `learn_system/app/api/server.py` | **Modify** | Start heartbeat on app startup |

**Directory structure follows existing patterns:**
```
learn_system/
  app/
    services/
      __init__.py          # exists
      conversion.py        # exists (PPTX conversion)
      heartbeat.py         # NEW - heartbeat service
    api/
      routes/
        health.py          # MODIFY - add status endpoint
      server.py            # MODIFY - start on lifespan
```

**Why `services/heartbeat.py`:**
- Follows existing pattern: `services/conversion.py` handles document conversion
- Services are for background/utility tasks separate from API routes
- Single responsibility: heartbeat logic in one place

---

### 6.3 Testing the Heartbeat

**Three testing approaches: local dry-run, manual trigger, production verification.**

#### Local Dry-Run (before commit)

```bash
cd learn_system/

# Test heartbeat function directly
python -c "
from app.services.heartbeat import ping_supabase
import asyncio
result = asyncio.run(ping_supabase())
print(f'Ping result: {result}')
"
```

#### Manual Trigger Endpoint

Add optional manual trigger (useful for debugging):

```python
# In routes/health.py
@router.post("/api/heartbeat/trigger")
async def trigger_heartbeat():
    """Manually trigger a heartbeat ping. For debugging only."""
    from ..services.heartbeat import ping_supabase
    result = await ping_supabase()
    return {"triggered": True, "success": result}
```

#### Verify in Production

```bash
# After deploying
ssh learning-prod
docker compose logs -f --tail=50 | grep -i heartbeat

# Or check status endpoint
curl http://localhost:8001/api/heartbeat/status
```

#### Integration Test (optional, add to pytest)

```python
# tests/unit/test_heartbeat.py
import pytest
from app.services.heartbeat import ping_supabase

@pytest.mark.asyncio
async def test_heartbeat_ping():
    """Heartbeat should successfully ping Supabase."""
    result = await ping_supabase()
    assert result is True
```

---

### 6.4 Maintenance Considerations

#### If Supabase URL Changes

1. Update EC2 `.env` file:
   ```bash
   ssh learning-prod
   cd /home/ubuntu/app/learn_system
   nano .env  # Update SUPABASE_URL
   ```

2. Restart container (env changes require full restart):
   ```bash
   docker compose down
   docker compose up -d
   ```

3. No code changes needed - heartbeat uses `get_supabase_url()` from config.py

#### Documentation Requirements

Add to EXECPLAN.md "Operational Procedures" section:

```markdown
### Heartbeat Monitoring

**View heartbeat status:**
ssh learning-prod
curl http://localhost:8001/api/heartbeat/status

**Check heartbeat logs:**
docker compose logs -f 2>&1 | grep heartbeat

**Heartbeat runs:** Every 6 hours (configurable via HEARTBEAT_INTERVAL_HOURS env var)
```

#### Rollback Procedure

If heartbeat causes issues:

1. **Quick disable (no redeploy):**
   ```bash
   ssh learning-prod
   cd /home/ubuntu/app/learn_system
   echo "HEARTBEAT_ENABLED=false" >> .env
   docker compose down && docker compose up -d
   ```

2. **Full rollback:**
   ```bash
   ssh learning-prod
   cd /home/ubuntu/app
   git log --oneline -5  # Find pre-heartbeat commit
   git checkout <commit>
   cd learn_system
   docker compose down && docker compose up -d --build
   ```

---

### 6.5 Future Considerations

**Keep simple, but extensible.**

#### Current Scope (v1)
- Simple Supabase ping every 6 hours
- Log success/failure
- Status endpoint for manual checks

#### Potential Extensions (v2+)

| Feature | Implementation | When to Add |
|---------|----------------|-------------|
| Multi-service health | Add checks for Claude/Groq API reachability | If API failures become issue |
| Alerting | Send email/Slack on consecutive failures | If uptime becomes critical |
| Metrics dashboard | Store ping times in DB, display on /admin | For debugging latency |
| Dynamic interval | Adjust based on usage patterns | Premature optimization |

**Extension pattern:**

```python
# Future: services/health_monitor.py
class HealthMonitor:
    def __init__(self):
        self.checks = [
            SupabaseCheck(),
            # Future: ClaudeAPICheck(),
            # Future: GroqAPICheck(),
        ]

    async def run_all(self) -> dict:
        results = {}
        for check in self.checks:
            results[check.name] = await check.run()
        return results
```

**For now:** Start with single `ping_supabase()` function. Refactor to class pattern only if 3+ health checks needed.

---

### 6.6 Implementation Checklist

```markdown
- [ ] Create `learn_system/app/services/heartbeat.py`
- [ ] Add `ping_supabase()` async function
- [ ] Add background task scheduler (asyncio)
- [ ] Modify `server.py` to start heartbeat on lifespan
- [ ] Add `/api/heartbeat/status` endpoint to `health.py`
- [ ] Test locally with dry-run
- [ ] Add unit test (optional)
- [ ] Commit with message: `feat(heartbeat): Add Supabase connection heartbeat`
- [ ] Deploy to EC2: `git pull && docker compose down && docker compose up -d --build`
- [ ] Verify in production logs
- [ ] Document in EXECPLAN.md Operational Procedures
```

---

### 6.7 Code Skeleton

**`learn_system/app/services/heartbeat.py`:**

```python
"""Supabase connection heartbeat to prevent hibernation."""

import asyncio
import logging
import os
from datetime import datetime
from typing import Optional

from ..database.connection import get_client

logger = logging.getLogger(__name__)

# Configuration
HEARTBEAT_INTERVAL_HOURS = int(os.getenv('HEARTBEAT_INTERVAL_HOURS', '6'))
HEARTBEAT_ENABLED = os.getenv('HEARTBEAT_ENABLED', 'true').lower() == 'true'

# State tracking
_last_ping: Optional[datetime] = None
_last_success: bool = False


async def ping_supabase() -> bool:
    """
    Ping Supabase with a lightweight query to keep connection active.

    Returns:
        True if ping succeeded, False otherwise
    """
    global _last_ping, _last_success
    _last_ping = datetime.utcnow()

    try:
        client = get_client()
        # Minimal query - just check connection works
        result = client.table('technique_bundles').select('id').limit(1).execute()
        _last_success = True
        logger.info(f"Heartbeat ping successful at {_last_ping.isoformat()}")
        return True
    except Exception as e:
        _last_success = False
        logger.error(f"Heartbeat ping failed: {e}")
        return False


async def heartbeat_loop():
    """Background task that pings Supabase periodically."""
    if not HEARTBEAT_ENABLED:
        logger.info("Heartbeat disabled via HEARTBEAT_ENABLED=false")
        return

    interval_seconds = HEARTBEAT_INTERVAL_HOURS * 3600
    logger.info(f"Heartbeat started: pinging every {HEARTBEAT_INTERVAL_HOURS} hours")

    while True:
        await ping_supabase()
        await asyncio.sleep(interval_seconds)


def get_heartbeat_status() -> dict:
    """Get current heartbeat status for the status endpoint."""
    return {
        "enabled": HEARTBEAT_ENABLED,
        "interval_hours": HEARTBEAT_INTERVAL_HOURS,
        "last_ping": _last_ping.isoformat() if _last_ping else None,
        "last_success": _last_success
    }
```

**Modify `learn_system/app/api/server.py`:**

```python
# Add to imports
from contextlib import asynccontextmanager
import asyncio

# Add lifespan handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from .services.heartbeat import heartbeat_loop
    task = asyncio.create_task(heartbeat_loop())
    yield
    # Shutdown
    task.cancel()

# Modify create_app to use lifespan
def create_app() -> FastAPI:
    app = FastAPI(
        title="Personal Learning System API",
        lifespan=lifespan,  # Add this
        ...
    )
```

**Modify `learn_system/app/api/routes/health.py`:**

```python
@router.get("/heartbeat/status")
async def heartbeat_status():
    """Get heartbeat service status."""
    from ..services.heartbeat import get_heartbeat_status
    return get_heartbeat_status()
```

---

### 6.8 Deployment Steps (Specific)

Following the established deployment procedure from EXECPLAN.md:

```bash
# 1. Local testing
cd learn_system/
python -c "from app.services.heartbeat import ping_supabase; import asyncio; print(asyncio.run(ping_supabase()))"

# 2. Commit and push
git add learn_system/app/services/heartbeat.py
git add learn_system/app/api/routes/health.py
git add learn_system/app/api/server.py
git commit -m "feat(heartbeat): Add Supabase connection heartbeat

- Add heartbeat.py service with background ping loop
- Add /api/heartbeat/status endpoint
- Configurable via HEARTBEAT_INTERVAL_HOURS and HEARTBEAT_ENABLED
- Prevents Supabase free tier hibernation

Co-Authored-By: Claude <noreply@anthropic.com>"
git push

# 3. Deploy to production
ssh learning-prod
cd /home/ubuntu/app
git pull
cd learn_system
docker compose down
docker compose up -d --build

# 4. Verify deployment
curl http://localhost:8001/api/health
curl http://localhost:8001/api/heartbeat/status
docker compose logs --tail=20 | grep heartbeat
```

---

### 6.9 Summary

| Aspect | Decision |
|--------|----------|
| Deployment | Part of existing backend, normal git workflow |
| File location | `learn_system/app/services/heartbeat.py` |
| Testing | Local dry-run + status endpoint + logs |
| Config changes | None required (uses existing SUPABASE_URL) |
| Rollback | Set `HEARTBEAT_ENABLED=false` in .env |
| Future | Keep simple; add monitoring only if issues arise |
