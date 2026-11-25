# Purple Foods — Customer Web App (apps/web)

React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui. PWA-first customer storefront for the Purple Foods platform (Lagos launch).

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production bundle in dist/
```

## PWA icons

Binary icons are generated, not committed. After cloning:

```bash
pip install Pillow
python3 scripts/generate-icons.py   # writes public/icon-192.png, icon-512.png, apple-touch-icon.png, favicon.png
```

## State (Phase 1 preview)

Cart, orders and demo sign-in persist in `localStorage`. The backend graft (tRPC + Drizzle + Neon Postgres) replaces this next; seed data in `src/data.ts` is the menu catalog until merchant onboarding ships.

© Smadsoft Technology Limited
