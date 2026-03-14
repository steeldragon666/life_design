#!/usr/bin/env bash
# scripts/setup-production.sh
#
# Production environment setup checklist for the Life Design app.
#
# This script validates your local tooling and environment, then walks through
# each infrastructure step with explicit instructions. It does NOT make any
# destructive changes — it is safe to run multiple times.
#
# Usage:
#   chmod +x scripts/setup-production.sh
#   ./scripts/setup-production.sh

set -euo pipefail

# ─── Colour helpers ───────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

step()    { echo -e "\n${BOLD}${BLUE}==>${RESET} ${BOLD}$*${RESET}"; }
ok()      { echo -e "  ${GREEN}[ok]${RESET}  $*"; }
warn()    { echo -e "  ${YELLOW}[warn]${RESET} $*"; }
fail()    { echo -e "  ${RED}[fail]${RESET} $*"; }
info()    { echo -e "        $*"; }
divider() { echo -e "\n${BLUE}────────────────────────────────────────────────────────${RESET}"; }

ERRORS=0

# ─── 1. Prerequisite checks ───────────────────────────────────────────────────

divider
step "Checking required CLI tools"

check_tool() {
  local cmd="$1"
  local install_hint="$2"
  if command -v "$cmd" &>/dev/null; then
    ok "$cmd  ($(command -v "$cmd"))"
  else
    fail "$cmd not found."
    info "Install: $install_hint"
    ERRORS=$((ERRORS + 1))
  fi
}

check_tool node      "https://nodejs.org  (v18 or later required)"
check_tool pnpm      "npm install -g pnpm@9"
check_tool supabase  "brew install supabase/tap/supabase   OR   npm install -g supabase"
check_tool vercel    "npm install -g vercel"
check_tool stripe    "brew install stripe/stripe-cli/stripe   OR   https://stripe.com/docs/stripe-cli"
check_tool openssl   "Bundled with most operating systems"

# Node version check
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
  if [ "$NODE_MAJOR" -lt 18 ]; then
    fail "Node.js v$NODE_MAJOR detected — v18 or later required."
    ERRORS=$((ERRORS + 1))
  else
    ok "Node.js v$(node --version | tr -d v)  (>= 18)"
  fi
fi

# ─── 2. .env file check ───────────────────────────────────────────────────────

divider
step "Checking environment configuration"

ENV_FILE="$(dirname "$0")/../apps/web/.env.local"
ENV_EXAMPLE="$(dirname "$0")/../apps/web/.env.example"

if [ -f "$ENV_FILE" ]; then
  ok ".env.local exists at apps/web/.env.local"
else
  warn ".env.local not found."
  info "Copy the example and fill in all values:"
  info "  cp apps/web/.env.example apps/web/.env.local"
  ERRORS=$((ERRORS + 1))
fi

# Check each required variable is present and non-empty
REQUIRED_VARS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  STRIPE_PRICE_MONTHLY
  STRIPE_PRICE_ANNUAL
  STRIPE_PRICE_LIFETIME
  GOOGLE_AI_API_KEY
  STRAVA_CLIENT_ID
  STRAVA_CLIENT_SECRET
  STRAVA_REDIRECT_URI
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_REDIRECT_URI
  ENCRYPTION_KEY
  NEXT_PUBLIC_APP_URL
)

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a

  for VAR in "${REQUIRED_VARS[@]}"; do
    VALUE="${!VAR:-}"
    if [ -z "$VALUE" ]; then
      warn "$VAR is not set in .env.local"
      ERRORS=$((ERRORS + 1))
    else
      ok "$VAR is set"
    fi
  done

  # Validate ENCRYPTION_KEY is exactly 64 hex characters (256-bit)
  ENC_KEY="${ENCRYPTION_KEY:-}"
  if [[ -n "$ENC_KEY" && ! "$ENC_KEY" =~ ^[0-9a-fA-F]{64}$ ]]; then
    fail "ENCRYPTION_KEY must be a 64-character hex string (256-bit)."
    info "Generate a new one with:  openssl rand -hex 32"
    ERRORS=$((ERRORS + 1))
  fi
fi

# ─── 3. Supabase project configuration ───────────────────────────────────────

divider
step "Supabase project setup"

info "Ensure the following Supabase Pro features are enabled in your project:"
echo ""
info "  ${BOLD}Point-in-Time Recovery (PITR)${RESET}"
info "    Dashboard → Settings → Addons → Enable PITR"
info "    Required for: production database backup and disaster recovery"
echo ""
info "  ${BOLD}Connection Pooling (PgBouncer)${RESET}"
info "    Dashboard → Settings → Database → Connection Pooling → Enable"
info "    Mode: Transaction  |  Pool size: 20 (adjust per load)"
info "    Use the pooled connection string in DATABASE_URL for serverless"
echo ""
info "  ${BOLD}Read Replicas${RESET}"
info "    Dashboard → Settings → Infrastructure → Read replicas"
info "    Recommended for: analytics queries and the correlation pipeline"
echo ""
info "  ${BOLD}Auth configuration${RESET}"
info "    Dashboard → Auth → URL Configuration"
info "    Set Site URL to: \$NEXT_PUBLIC_APP_URL"
info "    Add redirect URLs:"
info "      \$NEXT_PUBLIC_APP_URL/auth/callback"
info "      \$NEXT_PUBLIC_APP_URL/api/auth/callback"
echo ""
info "  ${BOLD}Row Level Security${RESET}"
info "    Verify all tables have RLS enabled:"
info "      supabase db lint --level error"
echo ""
info "  ${BOLD}pg_cron extension (for expire_stale_sessions)${RESET}"
info "    Dashboard → Database → Extensions → Enable pg_cron"
info "    Then schedule the cleanup function:"
info "      SELECT cron.schedule("
info "        'expire-stale-sessions',"
info "        '0 3 * * *',"     # 3 AM UTC daily
info "        \$\$SELECT expire_stale_sessions()\$\$"
info "      );"

# ─── 4. Run database migrations ───────────────────────────────────────────────

divider
step "Database migrations"

info "Apply all pending migrations to your Supabase project:"
echo ""
info "  ${BOLD}Local development:${RESET}"
info "    supabase db reset           (wipe + apply all + seed)"
info "    supabase db push            (apply new migrations only)"
echo ""
info "  ${BOLD}Production (linked project):${RESET}"
info "    supabase link --project-ref <YOUR_PROJECT_REF>"
info "    supabase db push --linked"
echo ""
info "  ${BOLD}Verify:${RESET}"
info "    supabase db diff            (should show no pending changes)"

# ─── 5. Stripe configuration ─────────────────────────────────────────────────

divider
step "Stripe billing setup"

info "Create the following products in your Stripe dashboard:"
echo ""
info "  ${BOLD}1. Life Design Monthly${RESET}    \$9.99/month (recurring)"
info "     Copy the Price ID → STRIPE_PRICE_MONTHLY"
echo ""
info "  ${BOLD}2. Life Design Annual${RESET}     \$99/year (recurring)"
info "     Copy the Price ID → STRIPE_PRICE_ANNUAL"
echo ""
info "  ${BOLD}3. Life Design Lifetime${RESET}   \$249 (one-time)"
info "     Copy the Price ID → STRIPE_PRICE_LIFETIME"
echo ""
info "  ${BOLD}Webhook endpoint:${RESET}"
info "    URL: \$NEXT_PUBLIC_APP_URL/api/checkout/webhook"
info "    Events to listen for:"
info "      checkout.session.completed"
info "      customer.subscription.updated"
info "      customer.subscription.deleted"
info "      invoice.payment_failed"
info "      invoice.payment_succeeded"
echo ""
info "  ${BOLD}Test the webhook locally:${RESET}"
info "    stripe listen --forward-to localhost:3000/api/checkout/webhook"

# ─── 6. Vercel deployment ─────────────────────────────────────────────────────

divider
step "Vercel deployment"

info "Required environment variables in your Vercel project:"
echo ""
for VAR in "${REQUIRED_VARS[@]}"; do
  info "  $VAR"
done
echo ""
info "  NEXT_PUBLIC_SENTRY_DSN"
info "  SENTRY_AUTH_TOKEN"
info "  NEXT_PUBLIC_POSTHOG_KEY"
info "  NEXT_PUBLIC_POSTHOG_HOST"
echo ""
info "  ${BOLD}Add via Vercel CLI:${RESET}"
info "    vercel env add <VAR_NAME> production"
echo ""
info "  ${BOLD}Or in bulk via Vercel dashboard:${RESET}"
info "    Project → Settings → Environment Variables"
echo ""
info "  ${BOLD}Deploy:${RESET}"
info "    vercel --prod"
echo ""
info "  ${BOLD}Verify headers (after deploy):${RESET}"
info "    curl -sI \$NEXT_PUBLIC_APP_URL | grep -E 'x-content-type|x-frame|strict-transport'"

# ─── 7. Monitoring setup ─────────────────────────────────────────────────────

divider
step "Monitoring and observability"

info "  ${BOLD}Sentry${RESET}"
info "    1. Create a Next.js project at https://sentry.io"
info "    2. Run: pnpm add @sentry/nextjs  (in apps/web)"
info "    3. Run: npx @sentry/wizard@latest -i nextjs"
info "    4. Set NEXT_PUBLIC_SENTRY_DSN and SENTRY_AUTH_TOKEN in Vercel"
echo ""
info "  ${BOLD}PostHog${RESET}"
info "    1. Create a project at https://app.posthog.com"
info "    2. Run: pnpm add posthog-js  (in apps/web)"
info "    3. Wrap root layout with <PostHogProvider> from"
info "       apps/web/src/app/providers/PostHogProvider.tsx"
info "    4. Set NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST"
echo ""
info "  ${BOLD}Health check${RESET}"
info "    Endpoint: GET \$NEXT_PUBLIC_APP_URL/api/health"
info "    Configure your uptime monitor (Better Uptime, Checkly, etc.) to"
info "    poll this endpoint every 60 seconds and alert on non-200 responses."

# ─── 8. Security checklist ───────────────────────────────────────────────────

divider
step "Pre-launch security checklist"

info "  [ ] All Supabase tables have RLS enabled"
info "  [ ] Service role key is not exposed client-side"
info "  [ ] ENCRYPTION_KEY is a fresh 256-bit value (not a test value)"
info "  [ ] Stripe webhook signature verification is active"
info "  [ ] CORS is restricted to \$NEXT_PUBLIC_APP_URL in API routes"
info "  [ ] Security headers validated at https://securityheaders.com"
info "  [ ] Supabase PITR is enabled and tested"
info "  [ ] Rate limiting is active on /api/auth/* and /api/checkout/*"

# ─── Summary ─────────────────────────────────────────────────────────────────

divider
if [ "$ERRORS" -gt 0 ]; then
  echo -e "\n${RED}${BOLD}Setup incomplete — $ERRORS issue(s) found above.${RESET}"
  echo -e "Resolve each ${RED}[fail]${RESET} and ${YELLOW}[warn]${RESET} item before deploying to production.\n"
  exit 1
else
  echo -e "\n${GREEN}${BOLD}All prerequisite checks passed.${RESET}"
  echo -e "Follow the steps above to complete your production configuration.\n"
  exit 0
fi
