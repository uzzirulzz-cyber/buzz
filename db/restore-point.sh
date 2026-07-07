#!/bin/bash
# ============================================================
# BlockExchange — DB Restore Point
# ============================================================
# Resets the Neon PostgreSQL database to a clean state and re-seeds
# the 6 default staff accounts.
#
# Seeded accounts:
#   Super Admin:  crdbixx@gmail.com / 123playbeat  (uid=BX-000001)
#   Sub-Agent 1:  subagent1@trade.com / default    (uid=BX-000002, PB-AG001)
#   Sub-Agent 2:  subagent2@trade2.com / default   (uid=BX-000003, PB-AG002)
#   Sub-Agent 3:  subagent3@trade3.com / default   (uid=BX-000004, PB-AG003)
#   Sub-Agent 4:  subagent4@trade4.com / default   (uid=BX-000005, PB-AG004)
#   Sub-Agent 5:  subagent5@trade5.com / default   (uid=BX-000006, PB-AG005)
#
# Usage:  bash db/restore-point.sh
# ============================================================

set -e
cd /home/z/my-project

export DATABASE_URL="postgresql://neondb_owner:npg_sA0yePr6bTpX@ep-proud-mountain-ahl1fd3b-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
export DIRECT_URL="$DATABASE_URL"

echo "🔄 Step 1/4: Resetting database..."
bunx prisma db push --force-reset 2>&1 | tail -3

echo "🌱 Step 2/4: Regenerating Prisma Client..."
bunx prisma generate 2>&1 | tail -2

echo "🚀 Step 3/4: Starting dev server..."
pkill -f "next dev" 2>/dev/null || true
sleep 1
setsid bash -c 'unset DATABASE_URL DIRECT_URL && bun run dev' > /tmp/restore-dev.log 2>&1 < /dev/null &
disown
sleep 14

echo "📋 Step 4/4: Seeding default accounts..."
SEED_RESULT=$(curl -s -X POST http://localhost:3000/api/auth/seed)
echo "  $SEED_RESULT"

# Verify
echo ""
echo "=== Verification ==="
SA=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"crdbixx@gmail.com","password":"123playbeat"}')
echo "$SA" | python3 -c "import json,sys; u=json.load(sys.stdin)['user']; print(f'  ✓ Super Admin:  uid={u[\"uid\"]}  role={u[\"role\"]}  balance={u[\"balance\"]}')" 2>/dev/null

SUB1=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"subagent1@trade.com","password":"default"}')
echo "$SUB1" | python3 -c "import json,sys; u=json.load(sys.stdin)['user']; print(f'  ✓ Sub-Agent 1:  uid={u[\"uid\"]}  code={u.get(\"invitationCode\")}  mustChange={u.get(\"mustChangePassword\")}')" 2>/dev/null

SUB5=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"subagent5@trade5.com","password":"default"}')
echo "$SUB5" | python3 -c "import json,sys; u=json.load(sys.stdin)['user']; print(f'  ✓ Sub-Agent 5:  uid={u[\"uid\"]}  code={u.get(\"invitationCode\")}')" 2>/dev/null

pkill -f "next dev" 2>/dev/null || true

echo ""
echo "✅ Restore point complete! Database is at a clean, seeded baseline."
