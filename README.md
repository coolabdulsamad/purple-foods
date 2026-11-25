# Purple Foods

Nigeria-first, four-sided food delivery and quick-commerce platform — Customer, Rider, Merchant, and Admin Command Center.

Created and copyrighted by **Smadsoft Technology Limited**.

## Monorepo layout

```
apps/
  web/       Customer storefront (React + TypeScript + Vite + Tailwind + shadcn/ui, PWA)
  admin/     Admin Command Center (35+ governed pages, RBAC) — Phase 1+
  api/       Backend API (tRPC + Drizzle ORM + Hono) — Phase 1+
  mobile/    Flutter apps (customer + rider, iOS/Android) — Phase 2+
packages/
  types/     Shared TypeScript types and domain contracts
  config/    Shared tooling config (eslint, tsconfig, tailwind preset)
docs/        Project documentation (see master blueprint)
infra/       Infrastructure-as-code, CI workflows, deploy scripts
```

## Master references

- `docs/` — phased specs derived from the Purple Foods Master Project Blueprint (merged edition)
- Design system: Deep Plum `#2E1065`, Royal Purple `#6B21A8`, Electric Violet `#9333EA`, Saffron `#F59E0B`, Mint `#10B981`, Lilac `#F5F3FF`; Plus Jakarta Sans / Inter / JetBrains Mono; Lucide icons

## Delivery plan

24 weeks, five gated phases:

| Phase | Weeks | Scope |
|---|---|---|
| P0 | Pre-1 | Discovery, city selection, legal/provider validation |
| P1 | 1–4 | Foundation: CI/CD, schema, auth, RBAC shell, ledger split |
| P2 | 5–9 | Marketplace MVP: vendors, cart, payments, live tracking |
| P3 | 10–14 | Logistics: rider app, dispatch engine, KDS, batching |
| P4 | 15–20 | Growth & AI: referrals, PurplePass, POS API, batching+ |
| P5 | 21–24 | QA, load test, pen test, store review, city launch |

## Getting started

```bash
npm install
npm run dev        # customer storefront (apps/web)
```

## License

Proprietary — © Smadsoft Technology Limited. All rights reserved.
