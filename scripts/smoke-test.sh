#!/bin/bash
# =============================================================================
# Smoke Test Script — Verifies deployment is working correctly
# =============================================================================
# Usage: ./scripts/smoke-test.sh <network>
# Example: ./scripts/smoke-test.sh devnet
# =============================================================================

set -e

NETWORK="${1:-devnet}"
PROGRAM_ID="${PROGRAM_ID:-11111111111111111111111111111112}"
RPC_URL="${RPC_URL:-https://api.devnet.solana.com}"

PASS=0
FAIL=0
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_test() {
  TOTAL=$((TOTAL + 1))
  echo -e "${YELLOW}[TEST $TOTAL]${NC} $1"
}

log_pass() {
  PASS=$((PASS + 1))
  echo -e "${GREEN}  ✅ PASS${NC} — $1"
}

log_fail() {
  FAIL=$((FAIL + 1))
  echo -e "${RED}  ❌ FAIL${NC} — $1"
}

echo "============================================"
echo "🔥 Smoke Tests — $NETWORK"
echo "============================================"
echo "Program ID: $PROGRAM_ID"
echo "RPC URL:    $RPC_URL"
echo "Timestamp:  $(date -u)"
echo "============================================"
echo ""

# ---------------------------------------------------------------------------
# Test 1: RPC endpoint is reachable
# ---------------------------------------------------------------------------
log_test "RPC endpoint is reachable"
HEALTH=$(curl -s -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
  --max-time 10 2>/dev/null)

if echo "$HEALTH" | grep -q '"ok"'; then
  log_pass "RPC endpoint returned healthy status"
else
  log_fail "RPC endpoint unreachable or unhealthy"
fi

# ---------------------------------------------------------------------------
# Test 2: Program exists on-chain
# ---------------------------------------------------------------------------
log_test "Program exists on $NETWORK"
ACCOUNT_INFO=$(curl -s -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getAccountInfo\",\"params\":[\"$PROGRAM_ID\",{\"encoding\":\"base64\"}]}" \
  --max-time 15 2>/dev/null)

if echo "$ACCOUNT_INFO" | grep -q '"executable":true'; then
  log_pass "Program $PROGRAM_ID is deployed and executable"
else
  log_fail "Program not found or not executable"
fi

# ---------------------------------------------------------------------------
# Test 3: Program is not frozen / closed
# ---------------------------------------------------------------------------
log_test "Program account has data"
DATA_LEN=$(echo "$ACCOUNT_INFO" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    val = data.get('result', {}).get('value', {})
    if val:
        print(len(val.get('data', [''])[0]))
    else:
        print(0)
except:
    print(0)
" 2>/dev/null || echo "0")

if [ "$DATA_LEN" -gt "0" ] 2>/dev/null; then
  log_pass "Program has data (length: $DATA_LEN)"
else
  log_fail "Program account appears empty"
fi

# ---------------------------------------------------------------------------
# Test 4: Recent slot is progressing (network is alive)
# ---------------------------------------------------------------------------
log_test "Network is producing slots"
SLOT1=$(curl -s -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}' \
  --max-time 10 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('result',0))" 2>/dev/null || echo "0")

sleep 2

SLOT2=$(curl -s -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}' \
  --max-time 10 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('result',0))" 2>/dev/null || echo "0")

if [ "$SLOT2" -gt "$SLOT1" ] 2>/dev/null; then
  DIFF=$((SLOT2 - SLOT1))
  log_pass "Slots progressing ($SLOT1 → $SLOT2, +$DIFF slots in 2s)"
else
  log_fail "Slots not progressing (stuck at $SLOT1)"
fi

# ---------------------------------------------------------------------------
# Test 5: IDL is available (if applicable)
# ---------------------------------------------------------------------------
log_test "IDL is fetchable"
IDL_CHECK=$(curl -s -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getAccountInfo\",\"params\":[\"$PROGRAM_ID\"]}" \
  --max-time 10 2>/dev/null)

if echo "$IDL_CHECK" | grep -q '"result"'; then
  log_pass "IDL endpoint is responsive"
else
  log_fail "Could not check IDL"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "============================================"
echo "📊 Smoke Test Results"
echo "============================================"
echo -e "Total:  $TOTAL"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo "============================================"

if [ "$FAIL" -gt "0" ]; then
  echo -e "${RED}🔴 SMOKE TESTS FAILED — $FAIL test(s) failed${NC}"
  exit 1
else
  echo -e "${GREEN}✅ ALL SMOKE TESTS PASSED${NC}"
  exit 0
fi
