# PROJECT_BOOTSTRAP.md

## RentIT Project Bootstrap Guide

This document explains how to safely bootstrap a RentIT-style project and reach a
**stable, known-good state** without re-debugging authentication, redirects,
or environment issues.

Follow the steps **in order**.

---

## 1. Prerequisites

- Node.js **18+** and npm installed
- MongoDB Atlas database (or local MongoDB)
- Resend account for transactional email (password reset + magic link)

---

## 2. Create or Clone the Project

### Option A: Clone an existing repo

```bash
git clone <your-repo-url>
cd rentit
```

### Option B: Start a new project

```bash
npx create-next-app@latest rentit
cd rentit
```

Recommended options:

- App Router: ✅
- TypeScript: ✅
- ESLint: ✅
- Tailwind: optional

---

## 3. Install Dependencies

```bash
npm install
```

(Auth and core dependencies should already be defined in `package.json`
for RentIT-style projects.)

---

## 4. Environment Variables (Required)

Create a `.env.local` file in the project root:

```env
NEXTAUTH_SECRET=your-long-random-secret
NEXTAUTH_URL=http://localhost:3000

MONGODB_URI=your-mongodb-uri
RESEND_API_KEY=your-resend-api-key

APP_BASE_URL=http://localhost:3000
```

### Rules
- `NEXTAUTH_URL` must **always** be set
- Restart the dev server after changing env vars
- Production `NEXTAUTH_URL` must match the deployed domain exactly

---

## 5. Run the Project Locally

```bash
npm run dev
```

Visit:
- http://localhost:3000

---

## 6. Authentication & Authorisation Pattern (Critical)

This project follows a **documented, opinionated auth and role model**.

- Custom `/login` page is the **only** sign-in UI
- Default NextAuth sign-in page is disabled
- Password login uses **CredentialsProvider**
- Magic link login uses **EmailProvider**
- Password reset and invite flows reuse the same mechanism
- Roles are enforced **server-side only**

📄 **Read `AUTH_PATTERN.md` before changing anything auth- or role-related.**

---

## 7. Routing & Redirect Rules (Do Not Skip)

- `/` must **not** contain auth or role logic
- `/login` is always public
- Protected routes live under role folders:
  - `/admin/*`
  - `/agent/*`
  - `/landlord/*`
- Role protection is enforced via **layout guards**, not pages
- Never protect `/` or `/login`

Most auth bugs are **redirect or routing bugs**, not provider bugs.

---

## 8. Linting

```bash
npm run lint
```

Fix lint issues before committing.

---

## 9. Production Build

```bash
npm run build
npm start
```

Ensure the build passes locally before deploying.

Auth and role behaviour is governed by AUTH_PATTERN.md.
---

## 10. Deployment

- Designed for **Vercel**, but works on any Next.js-compatible platform
- Ensure **all environment variables** are configured in the hosting platform
- Verify redirects and role access after deployment

---

## 11. When Something Breaks

Before touching auth or role code, check in this order:

1. Does `/login` load and remain public?
2. Are role layouts present (`admin/layout.tsx`, etc.)?
3. Is `NEXTAUTH_URL` correct for the environment?
4. Are redirects centralised (not hard-coded in pages)?
5. Are you accidentally linking to `/api/auth/signin`?

Only debug providers **after** these checks.

---

_Last updated: December 2025_
