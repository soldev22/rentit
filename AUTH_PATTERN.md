# AUTH_PATTERN.md

> This file is authoritative for **authentication AND authorisation** in RentIT.
> If auth-related behaviour changes, this file **must** be updated.

---

## Authentication Pattern for RentIT

### Overview
- Uses NextAuth.js with:
  - CredentialsProvider (email + password)
  - EmailProvider (magic link)
- Custom `/login` page is the **only** sign-in UI.
- Default NextAuth sign-in page is disabled.
- Password login and magic link login are separate flows.
- Post-login redirects are **role-based and centralised**.
- All role redirects are handled by `redirectByRole()`.

---

## Key Guardrails (Authentication)
- Password login uses `signIn("credentials", ...)` only.
- Magic link login uses `signIn("email", ...)` only.
- Do NOT mix or reuse logic between providers.
- Do NOT reintroduce the default NextAuth sign-in page.
- All login UI/UX changes must be made in `/login`.

---

## Authorisation & Roles

### Roles
Roles are first-class and enforced **server-side only**.

Valid roles:
- ADMIN
- AGENT
- LANDLORD
- TENANT
- APPLICANT
- TRADESPERSON
- ACCOUNTANT

Roles are:
- stored in the session/JWT
- never trusted from the client
- never enforced client-side

---

### Role Enforcement Rules
- Role checks MUST NOT be performed in client components.
- Role checks MUST NOT be duplicated in pages if a layout guard exists.
- Server-side enforcement is mandatory for all protected routes.

---

### Layout Guards
Role protection is enforced at the **layout level** wherever possible.

- `/admin/*` is protected by `src/app/admin/layout.tsx`
- `/agent/*` is protected by `src/app/agent/layout.tsx`
- `/landlord/*` is protected by `src/app/landlord/layout.tsx`

All routes under these folders automatically inherit role protection.

---

### requireRole Helper
- `requireRole()` is the **only approved helper** for enforcing roles.
- Inline checks like `session.user.role !== "X"` are **not allowed** in pages.
- If role logic changes, update `requireRole` — not individual pages.

---

## UI / UX

### `/login`
The `/login` page provides:
- Email + password form (always visible)
- “Sign in with email link” option (magic link)
- “Forgot password?” link

Design goals:
- Mobile-friendly
- Minimal
- Accessible

---

## Registration Rules
- Public self-registration is limited to:
  - TENANT
  - APPLICANT
- Staff roles (ADMIN, AGENT, LANDLORD, etc.) are created by ADMIN users only.
- Role assignment is never accepted from the client.
- Invite and password-set flows reuse the reset-password mechanism.

---

## Maintenance Notes
- If adding new auth methods, update `/login` only.
- Keep guardrail comments in:
  - `/login/page.tsx`
  - NextAuth config
  - `requireRole.ts`
- Review this file before making authentication or authorisation changes.

---

## Known Failure Modes (Avoid)
- Protecting `/` or redirecting from `/` causes auth redirect loops.
- Missing `NEXTAUTH_URL` causes unpredictable redirects.
- Mixing App Router redirects with NextAuth redirects causes loops.
- Hard-coded role redirects in pages cause drift and bugs.

---

## Do Not
- Do not redirect users to `/api/auth/signin`
- Do not call NextAuth callbacks manually
- Do not add auth logic to `/`
- Do not add role-based redirects in pages
- Do not bypass layout guards
- Do not introduce new auth flows without updating this file

---

_Last updated: December 2025_
