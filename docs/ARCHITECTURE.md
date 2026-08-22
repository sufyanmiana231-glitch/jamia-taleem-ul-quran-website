# Architecture

## Stack and why

- **Next.js 16 (App Router, TypeScript)** — file-based routing maps cleanly
  onto the module list (students, teachers, finance/*, ...), and Server/
  Client Components let data-heavy pages stay client-rendered (Firestore
  listeners) while static shell pages stay cheap.
- **Firebase (Auth + Firestore)** — matches the client's existing project
  (`jamia-taleem-ul-quran-database`), no server to operate, real-time
  listeners fit the "who's online marking attendance right now" use case.
- **Tailwind CSS v4** — theme tokens (`globals.css`) drive both the app UI
  and the chart palette from one place; RTL is handled via CSS logical
  properties (`ps-*`/`pe-*`/`start`/`end`) instead of a separate RTL
  stylesheet.
- **Zod** — one schema per entity is simultaneously the runtime validator,
  the TypeScript type (`z.infer`), and the Firestore document shape. No
  separate "interface" layer to drift out of sync.
- **Vitest** — the financial calculation layer (`finance-calculations.ts`)
  is pure functions with zero Firebase dependency, so it's unit-testable
  in milliseconds. This is where correctness bugs would be most costly,
  so it's the one layer with enforced test coverage.

## Layers (top to bottom)

```
app/(app)/**/page.tsx        — routes, one per nav item, mostly client components
components/**                — UI: ui/ (primitives), layout/, shared/, charts/,
                                students/, teachers/, classes/, attendance/, finance/, settings/
lib/services/                — finance-service.ts (writes), finance-calculations.ts (pure math)
lib/repositories/             — one file per entity family, built on firestoreRepository.ts factories
lib/auth/                    — AuthProvider, roles/permissions, route guards
lib/firebase/                — config + client singleton (the only files that import `firebase/*`
                                outside repositories)
domain/schema/                — Zod schemas + inferred types, the single source of truth
```

**Rule of thumb**: pages and components never call `firebase/firestore`
directly. They call a repository (`studentsRepository.subscribeAll(...)`)
or a service (`postExpense(...)`). This is what makes "connect Firebase
later without rewriting business logic" (spec §1) literally true — swap
`lib/firebase/client.ts` for a different backend and only that one file
plus the repository implementations change; every page, form, and
calculation is unaffected.

## The Firebase seam

`lib/firebase/config.ts` reads env vars and exports `isFirebaseConfigured`.
`lib/firebase/client.ts` lazily initializes the SDK — importing it is
always safe, including at build time and before `.env.local` exists.

Every repository method checks `isFirebaseConfigured` and degrades to an
empty/no-op result instead of throwing:

- `subscribeAll()` → calls back with `[]` once
- `getById()` → resolves `null`
- `create()`/`update()` → throw a clear error (these are only reachable
  from a form's submit handler, which the UI already hides behind
  `RequirePermission`/`RequireAuth` when Firebase isn't ready)

This means every page renders — with empty states — before a single
Firebase credential exists. `RequireAuth` (`lib/auth/RequireAuth.tsx`)
similarly lets the shell through unauthenticated when Firebase isn't
configured, rather than redirecting to a login page that can never
succeed; `FirebaseStatusBanner` makes that state visible instead of
silent.

## Repository layer

`lib/repositories/firestoreRepository.ts` has three factories so entities
don't each hand-roll the same CRUD boilerplate:

- `createRepository<T>()` — mutable entities with
  `createdAt/createdBy/updatedAt/updatedBy/isArchived`
  (students, teachers, classes, expenses, incomes, ...)
- `createLogRepository<T>()` — append-only logs, **no update method
  exists on the returned object** (salary history, loan repayments,
  academic history, audit log) — the type system enforces the "never
  overwrite history" rule from spec §17
- `createSingletonRepository<T>()` — one-doc collections (org settings)

A few entities need custom keying (`attendance.ts`, `finance.ts`
budgets/ledger) because their document ID encodes a natural key
(`${classId}_${date}`, `${categoryId}_${period}`) so repeated writes
upsert instead of duplicating — those are hand-written against the same
Firestore SDK calls, not the generic factories.

## Auth & RBAC

Firebase Auth handles sign-in; **authorization is a flat role stored in
`users/{uid}.role`**, not custom claims. This was a deliberate scope cut:
custom claims require a Cloud Functions deploy to set them server-side,
which this project doesn't have. The trade-off is documented, not hidden:
role changes take effect on next Firestore read (near-instant via the
live listener in `AuthProvider`), not next ID-token refresh.

- `lib/auth/roles.ts` — the permission matrix (`ROLE_PERMISSIONS`),
  the single place that maps role → allowed actions
- `lib/auth/AuthProvider.tsx` — first user to sign in becomes admin
  (checked by an empty `users` collection); every user after that needs
  an existing admin to set their role from Settings → Users
- `firestore.rules` — the **real** authorization boundary. UI checks
  (`can('finance:write')`) are for hiding buttons a user can't use, not
  security; a user who bypasses the UI still can't write anything the
  rules don't allow

## i18n

`lib/i18n/dictionaries/ur.ts` is the primary, fully-populated dictionary.
`en.ts` mirrors every key (`Dictionary` type keeps them in sync at
compile time) so a language toggle already works end-to-end — it's not
aspirational scaffolding. `LocaleProvider` persists the choice to
`localStorage` and flips `<html dir>` accordingly. Numbers and currency
stay in Latin digits in both languages (spec §3: "remain easy to
understand"), formatted in `lib/i18n/format.ts`.

## What's deliberately out of scope (v1)

Documented here so it reads as a decision, not an oversight:

- **Cloud Functions** — no server-side aggregation, scheduled jobs, or
  custom-claims setter. Budget "spent" totals are computed client-side
  from the ledger, which is fine at Jamia scale (hundreds to low
  thousands of records/year) but would want a scheduled rollup at 10x
  that volume.
- **PDF export** — CSV export (`lib/csv.ts`) ships; PDF would be a
  print-stylesheet or a server-rendered route, not added speculatively.
- **Hijri calendar** — all dates are Gregorian. The schema stores plain
  `YYYY-MM-DD` strings, so adding a Hijri *display* layer later doesn't
  touch any stored data.
- **File uploads** — student/teacher photos are a URL field, not a
  Firebase Storage upload flow. Wiring Storage is additive, not a
  breaking change to the schema.
