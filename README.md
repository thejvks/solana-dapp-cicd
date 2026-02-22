# Solana DApp CI/CD Pipeline

A **complete, production-grade CI/CD pipeline** for Solana DApp deployment — combining Anchor smart contract deployment and Next.js frontend deployment into a single automated workflow with canary deployments, rollback mechanisms, smoke tests, and Slack notifications.

## Why This Exists

Most Solana CI/CD tooling handles **either** program deployment **or** frontend hosting — never both. This project provides a **unified pipeline** that automates the full lifecycle:

```
git push → Lint → Test → Build → Deploy Program → Deploy Frontend → Smoke Test → Notify
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     GITHUB REPO                          │
│   programs/counter/    (Rust/Anchor smart contract)      │
│   app/                 (Next.js frontend)                │
│   .github/workflows/   (CI/CD pipeline definitions)      │
│   scripts/             (Smoke tests, rollback)           │
└─────────────────┬───────────────────────────────────────┘
                  │  git push
                  ▼
┌─────────────────────────────────────────────────────────┐
│              GITHUB ACTIONS PIPELINE                     │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │   LINT   │→ │   TEST   │→ │  BUILD   │              │
│  │ Clippy   │  │ Anchor   │  │ .so file │              │
│  │ ESLint   │  │ localnet │  │ Next.js  │              │
│  └──────────┘  └──────────┘  └────┬─────┘              │
│                                    │                     │
│                    ┌───────────────┼───────────────┐     │
│                    ▼               ▼               │     │
│            ┌──────────────┐ ┌──────────────┐       │     │
│            │ DEPLOY PROG  │ │ DEPLOY FRONT │       │     │
│            │  to Devnet   │ │  to Vercel   │       │     │
│            └──────┬───────┘ └──────────────┘       │     │
│                   ▼                                │     │
│            ┌──────────────┐                        │     │
│            │ SMOKE TESTS  │                        │     │
│            │ on Devnet    │                        │     │
│            └──────┬───────┘                        │     │
│                   ▼                                │     │
│            ┌──────────────┐                        │     │
│            │   APPROVAL   │ ← Manual gate          │     │
│            │    GATE      │                        │     │
│            └──────┬───────┘                        │     │
│                   ▼                                │     │
│            ┌──────────────┐ ┌──────────────┐       │     │
│            │ DEPLOY PROG  │ │ DEPLOY FRONT │       │     │
│            │ to Mainnet   │ │ to Prod      │       │     │
│            └──────────────┘ └──────────────┘       │     │
│                                                    │     │
│            ┌──────────────┐                        │     │
│            │   NOTIFY     │ → Slack                │     │
│            │   TEAM       │                        │     │
│            └──────────────┘                        │     │
└─────────────────────────────────────────────────────────┘
```

## Workflows

| Workflow | Trigger | What It Does |
|----------|---------|-------------|
| `ci.yml` | PR / push to develop | Lint → Test → Build (no deploy) |
| `deploy-devnet.yml` | Push to main / manual | Build → Deploy to devnet → Smoke test → Notify |
| `deploy-mainnet.yml` | Manual only | Build → Approval gate → Deploy to mainnet → Notify |

## Features

- **Automated Linting** — Clippy for Rust, ESLint for TypeScript
- **Anchor Integration Tests** — Runs on localnet in CI
- **Canary Deployments** — Deploy to devnet first, verify, then promote to mainnet
- **Manual Approval Gate** — GitHub Environment protection rules for mainnet
- **Rollback Mechanism** — Save program buffers, one-click rollback
- **Smoke Tests** — Automated post-deployment verification
- **Slack Notifications** — Team alerts on deploy success/failure
- **Build Artifacts** — Program .so files saved for 30 days
- **Dependency Caching** — Rust and Node caches for faster builds

## Quick Start

### 1. Clone and setup

```bash
git clone https://github.com/YOUR_USERNAME/solana-dapp-cicd.git
cd solana-dapp-cicd
npm install
cd app && npm install && cd ..
```

### 2. Configure GitHub Secrets

Go to your repo → Settings → Secrets and add:

```
DEVNET_DEPLOYER_KEYPAIR     # Base58 encoded keypair
DEVNET_SOLANA_RPC_URL       # Your devnet RPC (Helius/QuickNode)
MAINNET_DEPLOYER_KEYPAIR    # Base58 encoded keypair
MAINNET_SOLANA_RPC_URL      # Your mainnet RPC
VERCEL_TOKEN                # Vercel deployment token
VERCEL_ORG_ID               # Vercel org ID
VERCEL_PROJECT_ID           # Vercel project ID
SLACK_WEBHOOK_URL           # (Optional) Slack incoming webhook
```

### 3. Configure GitHub Environments

1. Go to Settings → Environments
2. Create `devnet` environment
3. Create `mainnet` environment with **Required reviewers** enabled

### 4. Push and watch

```bash
git add . && git commit -m "Initial commit" && git push
```

The CI pipeline runs automatically. Deploy to devnet by pushing to `main`.

## Project Structure

```
solana-dapp-cicd/
├── programs/counter/src/lib.rs    # Solana program (Rust/Anchor)
├── tests/counter.ts               # Integration tests
├── app/                           # Next.js frontend
│   ├── src/pages/index.tsx        # Counter UI with wallet
│   └── package.json
├── scripts/
│   ├── smoke-test.sh              # Post-deploy verification
│   └── rollback.sh                # Emergency rollback
├── .github/workflows/
│   ├── ci.yml                     # Lint + Test + Build
│   ├── deploy-devnet.yml          # Canary deployment
│   └── deploy-mainnet.yml         # Production deployment
├── Anchor.toml
├── Cargo.toml
└── package.json
```

## Rollback

### Automated (via GitHub Actions)

Run the `deploy-mainnet.yml` workflow manually with the `rollback_to` input set to the buffer address.

### Manual

```bash
./scripts/rollback.sh mainnet <BUFFER_ADDRESS>
```

## Tech Stack

- **Smart Contract:** Rust + Anchor Framework
- **Frontend:** Next.js + TypeScript + Solana Wallet Adapter
- **CI/CD:** GitHub Actions
- **Deployment:** Vercel (frontend) + Solana CLI (program)
- **Monitoring:** Smoke tests + Slack notifications

## License

MIT
