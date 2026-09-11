<<<<<<< HEAD
# BillFlow AI

AI-powered invoicing for WhatsApp-first small businesses.

## Core flow

WhatsApp Order
→ AI Understanding
→ Business Memory
→ Invoice Guardian
→ GST Invoice
→ Central Invoice Dashboard

## Tech stack

- React Native
- Expo
- TypeScript
- Supabase
- Web Dashboard
- LLM API

## Team responsibilities

- Mobile: feature/mobile
- Backend + AI: feature/backend-ai
- Web: feature/web

## Repository goals

This repository is intentionally minimal and hackathon-friendly. It sets up the shared structure, core type contracts, and documentation needed for parallel work without building the product features yet.

## Setup

1. Clone the repository.
2. Copy .env.example to .env and fill in the required values when each app is ready.
3. Review the docs in the docs/ folder before starting work.
4. Create a feature branch before making changes.

## Shared project rules

- Keep the main branch runnable.
- Do not push unfinished work directly to main.
- Use the documented feature branches and pull requests for collaboration.
- Do not change shared interfaces without notifying the team.
=======
# BillFlow AI 🚀
> Autonomous Agent that extracts orders from WhatsApp, applies Business Memory, validates GST compliance with Invoice Guardian, and generates deterministic invoices.

## Repository Structure
```text
BillFlow/
├── backend/          # Developer 2 (Node/TS Server + AI Pipeline)
│   ├── src/
│   │   ├── aiExtractor.ts    # Gemini 1.5 JSON parser with fallback
│   │   ├── memory.ts         # Customer history & price resolution
│   │   ├── gstCalculator.ts  # Deterministic CGST/SGST/IGST math
│   │   ├── guardian.ts       # Compliance & fraud detection
│   │   ├── server.ts         # Express API (:3001)
│   │   └── test-pipeline.ts  # E2E test runner
│   └── package.json
├── shared/           # Shared types (Single source of truth)
│   └── types/index.ts
├── supabase/         # PostgreSQL schema & migrations
│   └── migrations/01_init.sql
└── docs/             # API & Architecture documentation
    ├── api-contract.md
    └── architecture.md
```

## Quick Start (Developer 2 Backend)
```bash
cd backend
npm install
npm run dev
```

Server runs at `http://localhost:3001`.
Test endpoint: `POST /api/process-order`
>>>>>>> 12d1e5d (chore: initialize BillFlow AI repository)
