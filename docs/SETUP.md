# Setup

## 1. Install dependencies

```bash
npm install
```

The app builds and runs without Firebase configured — every page shows
a "Firebase not connected" banner/empty-state instead of crashing, so
you can review the UI before wiring up a backend.

## 2. Firebase project

The client provided these project details:

- **Project name**: Jamia-taleem-ul-quran-database
- **Project ID**: `jamia-taleem-ul-quran-database`
- **Project number**: `182107148945`

If this project doesn't exist yet, create it at
[console.firebase.google.com](https://console.firebase.google.com) with
that project ID. Then enable:

1. **Authentication** → Sign-in method → **Email/Password**
2. **Firestore Database** → Create database (start in production mode —
   `firestore.rules` in this repo defines the real access control)

## 3. Get the Web SDK config

Firebase Console → Project settings → General → "Your apps" → Add app →
Web. Copy the config values into `.env.local`:

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_FIREBASE_API_KEY` and `NEXT_PUBLIC_FIREBASE_APP_ID`
(the other values are already pre-filled from the known project ID).
These are **not secrets** — the Firebase Web SDK config identifies the
project; it doesn't authorize access. Access control is
`firestore.rules`, not this config. It's still kept out of git so each
environment (dev/staging/prod) can point at its own project without a
code change.

## 4. Deploy Firestore security rules

```bash
npm install -g firebase-tools   # if not already installed
firebase login
firebase use jamia-taleem-ul-quran-database
firebase deploy --only firestore:rules
```

(This repo doesn't include a `firebase.json` — running
`firebase init firestore` once, pointing it at the existing
`firestore.rules` file, will generate one.)

**Do not skip this step.** Without deployed rules, Firestore's default
"locked mode" denies all reads/writes, or — if the project was created
in "test mode" — allows anyone to read/write everything. Either way,
the app's role checks in the UI are not a substitute for these rules.

## 5. First run and admin bootstrap

```bash
npm run dev
```

Open `/login` and sign up (Firebase Auth Email/Password — there's no
public "create account" page by design; create the first user directly
in Firebase Console → Authentication → Users → Add user, or temporarily
enable a signup form).

**The first person to sign in becomes admin automatically** — checked by
the `users` collection being empty (see `AuthProvider.bootstrapOrLoadAppUser`
in `src/lib/auth/AuthProvider.tsx`). Every subsequent signup gets `role:
viewer` and needs an existing admin to change their role from
**Settings → Users**.

## 6. Seed default expense categories

Settings → Expense Categories → "پہلے سے طے شدہ زمرہ جات شامل کریں" adds
the standard set (utility bills, kitchen/grocery, student welfare,
general admin) the spec requires out of the box. Safe to click more than
once — it only adds categories that don't already exist by name.

## Environment variables reference

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | From Firebase Console |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Pre-filled: `<project-id>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Pre-filled: `jamia-taleem-ul-quran-database` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Only if adding photo uploads | Not used yet — photos are a URL field |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Pre-filled from the project number |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | From Firebase Console → Web app |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | No | Only if enabling Analytics |

## Verifying the connection

Settings → System tab shows live Firebase connection status. Once
`.env.local` is filled in and the dev server restarted (env vars are
read at build/start time), it should read "فائربیس مربوط ہے" (Firebase
is connected) and the login form should replace the "not configured"
notice on `/login`.
