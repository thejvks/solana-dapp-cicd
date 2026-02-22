#!/bin/bash
# =============================================================================
# Rollback Script — Emergency rollback to a previous program version
# =============================================================================
# Usage: ./scripts/rollback.sh <network> <buffer-address>
# Example: ./scripts/rollback.sh devnet 7SGJSG8aoZj39NeAkZvbUvsPDMRcUUrhRhPzgzKv7743
#
# This script deploys a previously saved buffer to roll back the on-chain
# program to a known-good state. Use when a deployment causes issues.
# =============================================================================

set -e

NETWORK="${1:-devnet}"
BUFFER_ADDRESS="${2}"
PROGRAM_ID="${PROGRAM_ID:-11111111111111111111111111111112}"

if [ -z "$BUFFER_ADDRESS" ]; then
  echo "❌ Error: Buffer address is required"
  echo ""
  echo "Usage: ./scripts/rollback.sh <network> <buffer-address>"
  echo ""
  echo "To find available buffers:"
  echo "  solana program show --buffers --buffer-authority <YOUR_KEYPAIR_PUBKEY>"
  exit 1
fi

# Set RPC based on network
case "$NETWORK" in
  devnet)
    RPC_URL="${DEVNET_RPC_URL:-https://api.devnet.solana.com}"
    ;;
  mainnet|mainnet-beta)
    RPC_URL="${MAINNET_RPC_URL:-https://api.mainnet-beta.solana.com}"
    ;;
  *)
    echo "❌ Unknown network: $NETWORK (use devnet or mainnet)"
    exit 1
    ;;
esac

echo "============================================"
echo "⏪ Emergency Rollback"
echo "============================================"
echo "Network:    $NETWORK"
echo "RPC:        $RPC_URL"
echo "Program:    $PROGRAM_ID"
echo "Buffer:     $BUFFER_ADDRESS"
echo "Timestamp:  $(date -u)"
echo "============================================"
echo ""

# Confirm rollback
read -p "⚠️  Are you sure you want to rollback? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Rollback cancelled."
  exit 0
fi

echo "🔄 Executing rollback..."

# Configure Solana
solana config set --url "$RPC_URL"

# Deploy from buffer
solana program deploy \
  --buffer "$BUFFER_ADDRESS" \
  --program-id "$PROGRAM_ID" \
  --with-compute-unit-price 50000

echo ""
echo "✅ Rollback completed successfully!"
echo ""
echo "Next steps:"
echo "  1. Run smoke tests: ./scripts/smoke-test.sh $NETWORK"
echo "  2. Verify the program is working as expected"
echo "  3. Investigate what caused the issue with the new deployment"
echo "  4. Fix the issue and re-deploy through the normal CI/CD pipeline"
