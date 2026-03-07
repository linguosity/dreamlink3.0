#!/bin/bash
# ============================================================
# Dreamlink 3.0 — Fresh DB Setup (New Supabase Project)
# Run this from the dreamlink3.0 project directory
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$PROJECT_DIR/.env"

echo ""
echo "🌙 Dreamlink 3.0 — Fresh Database Setup"
echo "========================================="
echo ""
echo "Your old Supabase project is paused. We'll create a new one"
echo "and push all 11 migrations automatically."
echo ""

# ── Step 1: Supabase CLI ──────────────────────────────────────
if ! command -v supabase &> /dev/null; then
  echo "📦 Installing Supabase CLI via Homebrew..."
  brew install supabase/tap/supabase
  echo ""
fi
echo "✅ Supabase CLI: $(supabase --version)"
echo ""

# ── Step 2: Login ─────────────────────────────────────────────
echo "🔐 Step 1 of 4: Login to Supabase (browser will open)..."
supabase login
echo ""

# ── Step 3: Create new project ───────────────────────────────
echo "🆕 Step 2 of 4: Create a new Supabase project"
echo ""
echo "  → Go to: https://supabase.com/dashboard/projects"
echo "  → Click 'New project'"
echo "  → Choose any name (e.g. dreamlink-v3), pick a region, set a DB password"
echo "  → Wait ~1 min for it to provision"
echo ""
read -p "  Press Enter once your new project is ready: "
echo ""

# ── Step 4: Collect new project details ──────────────────────
echo "📋 Step 3 of 4: Enter your new project details"
echo "  (Find these at: Project Settings → API)"
echo ""
read -p "  Project Ref (e.g. abcdefghijklmnop):       " NEW_REF
read -p "  Project URL (e.g. https://xxx.supabase.co): " NEW_URL
read -p "  Anon key:                                   " NEW_ANON_KEY
read -p "  Service role key:                           " NEW_SERVICE_KEY
read -s -p "  DB password (you set this at creation):    " NEW_DB_PASS
echo ""
echo ""

# ── Step 5: Update .env ───────────────────────────────────────
echo "✏️  Updating .env with new project credentials..."

# Backup old .env
cp "$ENV_FILE" "$ENV_FILE.bak"

# Use Python for cross-platform sed (macOS BSD sed has different -i syntax)
python3 - "$ENV_FILE" "$NEW_URL" "$NEW_ANON_KEY" "$NEW_SERVICE_KEY" <<'PYEOF'
import sys, re

env_file, new_url, new_anon, new_service = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

with open(env_file, 'r') as f:
    content = f.read()

content = re.sub(r'NEXT_PUBLIC_SUPABASE_URL=.*', f'NEXT_PUBLIC_SUPABASE_URL={new_url}', content)
content = re.sub(r'NEXT_PUBLIC_SUPABASE_ANON_KEY=.*', f'NEXT_PUBLIC_SUPABASE_ANON_KEY={new_anon}', content)
content = re.sub(r'SUPABASE_SERVICE_ROLE_KEY=.*', f'SUPABASE_SERVICE_ROLE_KEY={new_service}', content)
content = re.sub(r'SUPABASE_JWT_SECRET=.*', 'SUPABASE_JWT_SECRET=', content)

with open(env_file, 'w') as f:
    f.write(content)
print("  .env updated.")
PYEOF

echo "✅ .env updated (old .env backed up as .env.bak)"
echo ""

# ── Step 6: Link project ──────────────────────────────────────
echo "🔗 Step 4 of 4: Linking and pushing migrations..."
cd "$PROJECT_DIR"
supabase link --project-ref "$NEW_REF" --password "$NEW_DB_PASS"
echo ""

# ── Step 7: Push all migrations ──────────────────────────────
echo "🚀 Pushing all 11 migrations..."
supabase db push
echo ""

# ── Done ──────────────────────────────────────────────────────
echo "✅ Done! Fresh Dreamlink 3.0 database is live."
echo ""
echo "Tables created:"
echo "  • dream_entries        (analysis fields, raw_analysis JSONB)"
echo "  • bible_citations      (full verse text, source tracking)"
echo "  • profile              (language, bible version, reading level)"
echo "  • subscriptions        (Stripe plan + credits)"
echo "  • payments"
echo "  • chatgpt_interactions"
echo ""
echo "Next steps:"
echo "  npm run dev"
echo ""
echo "New project URL: $NEW_URL"
echo ""
