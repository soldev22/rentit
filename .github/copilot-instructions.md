# Copilot Instructions for RentIT

## Project Overview
- **Framework:** Next.js 13+ (App Router, TypeScript)
- **Purpose:** Multi-role rental platform (Admin, Landlord, Renter) with authentication and role-based dashboards.
- **Data Layer:** MongoDB via `mongodb` driver, accessed through `src/lib/mongodb.ts`.
- **Authentication:** NextAuth.js with credentials provider, custom user roles, JWT sessions, and MongoDB adapter.

## Key Architecture & Patterns
- **App Directory Structure:**
  - `src/app/` uses Next.js App Router. Each subfolder (e.g., `/admin`, `/landlord`, `/renter`, `/dashboard`) is a route with its own `page.tsx`.
  - `src/app/api/` contains API routes (e.g., `/api/auth/[...nextauth]`, `/api/register`).
- **Role-Based Routing:**
  - After login, users are redirected to dashboards based on their `role` (see `dashboard/page.tsx`).
  - Each role page checks session and role, redirecting unauthorized users.
- **User Model:**
  - Users have `name`, `email`, `tel`, `hashedPassword`, `role`, and `createdAt`.
  - Registration and login use Zod schemas for validation.
- **Styling:**
  - Uses Tailwind CSS (see `globals.css`, `postcss.config.mjs`).
  - Fonts loaded via `next/font` (Geist family).

## Developer Workflows
- **Start Dev Server:**
  - `npm run dev` (see README)
- **Linting:**
  - ESLint config in `eslint.config.mjs` (uses `eslint-config-next`)
- **Environment:**
  - Requires `MONGODB_URI` in `.env.local` (see `lib/mongodb.ts`).
- **Deployment:**
  - Designed for Vercel, but can run anywhere Next.js is supported.

## Conventions & Integration
- **API routes** use Next.js `route.ts` convention.
- **Session/role checks** are enforced server-side in page components.
- **User fetching** is abstracted in `lib/user.ts`.
- **Type augmentation** for NextAuth is in `types/next-auth.d.ts`.
- **Error handling**: API routes return JSON with error messages and status codes.

## Examples
- **Role check in dashboard:** See `src/app/dashboard/page.tsx`.
- **Registration API:** See `src/app/api/register/route.ts`.
- **Custom NextAuth config:** See `src/app/api/auth/[...nextauth]/route.ts`.

## Do/Don't
- **Do**: Use Zod for input validation, check user roles before rendering protected pages, use provided abstractions for DB access.
- **Don't**: Bypass session/role checks, hardcode sensitive values, or use client-side only auth for protected routes.
