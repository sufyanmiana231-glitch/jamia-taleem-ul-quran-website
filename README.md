# جامعہ تعلیم القرآن — نظم و انصرام سسٹم

Management system for Jamia Taleem-ul-Quran: students, teachers, classes,
attendance, and a full financial ledger (income, expenses, budgets,
salaries, loans). Urdu-first, RTL, built on Next.js + Firebase.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Firebase config — see docs/SETUP.md
npm run dev                  # http://localhost:3000
```

The app runs and renders even before `.env.local` is filled in — every
page shows a "Firebase not connected" state instead of crashing. See
[docs/SETUP.md](docs/SETUP.md) for the full setup, including deploying
`firestore.rules` and the first-admin bootstrap flow.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build (also runs typecheck) |
| `npm run lint` | ESLint |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — module layout, the
  Firebase abstraction seam, RBAC, i18n
- [docs/DATABASE.md](docs/DATABASE.md) — Firestore collections, the
  ledger model, why each entity is shaped the way it is
- [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md) — the financial
  formulas and invariants the app is built to guarantee
- [docs/SETUP.md](docs/SETUP.md) — Firebase project setup, environment
  variables, security rules deployment, first-admin bootstrap

## Tech stack

Next.js 16 (App Router, TypeScript), Tailwind CSS v4, Firebase
(Auth + Firestore), Zod, React Hook Form, Recharts, Vitest.
