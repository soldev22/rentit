# RentIT — Multi-Role Rental Platform
⚠️ Auth and roles are opinionated. Read AUTH_PATTERN.md before making changes.

RentIT is a modern, multi-role rental management platform built with
**Next.js (App Router)**, **TypeScript**, **MongoDB**, and **NextAuth.js**.

It supports distinct experiences for:
- Admin
- Agent
- Landlord
- Tenant
- Applicant
- Tradesperson
- Accountant

---

## Authentication & Authorisation (Important)

This project follows a **documented, opinionated authentication and role model**.

⚠️ **Do not modify auth or role behaviour without reading:**

- `AUTH_PATTERN.md`
- `PROJECT_BOOTSTRAP.md`

These documents are **authoritative** and exist to prevent regressions.

---

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variables

Create a `.env.local` file in the project root:

```env
NEXTAUTH_SECRET=your-long-random-secret
NEXTAUTH_URL=http://localhost:3000

MONGODB_URI=your-mongodb-uri
RESEND_API_KEY=your-resend-api-key

APP_BASE_URL=http://localhost:3000
```

Restart the dev server after changing env vars.

---

### 3. Run the development server

```bash
npm run dev
```

Open:
- http://localhost:3000

---

## Project Structure (High Level)

- `src/app/` — App Router routes
  - `admin/` — Admin-only control plane
  - `agent/` — Agent dashboards & workflows
  - `landlord/` — Landlord dashboards
- `src/lib/` — Shared server utilities (auth, guards, helpers)
- `docs/` — Authoritative project documentation

Role protection is enforced **server-side**, primarily via layout guards.

---

## Development Scripts

- Dev: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- Start (prod): `npm start`

---

## Deployment

- Designed for **Vercel**
- Works on any platform that supports Next.js
- Ensure all environment variables are configured correctly
- Production `NEXTAUTH_URL` must match the deployed domain

---

## Learn More

- Next.js — https://nextjs.org/docs
- NextAuth.js — https://next-auth.js.org
- MongoDB — https://mongodb.com/docs

---

© 2025 RentIT. All rights reserved.
