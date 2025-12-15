# AUTH_PATTERN.md

## Authentication Pattern for RentIT

### Overview
- Uses NextAuth.js with CredentialsProvider (password) and EmailProvider (magic link).
- Custom `/login` page is the only sign-in UI.
- Password login and magic link login are separate and both land on `/dashboard`.
- Default NextAuth sign-in page is disabled.

### Key Guardrails
- Password login uses `signIn("credentials", ...)` only.
- Magic link login uses `signIn("email", ...)` only.
- Do NOT mix or reuse logic between providers.
- Do NOT reintroduce the default NextAuth sign-in page.
- All login UI/UX changes must be made in `/login`.

### UI/UX
- `/login` page provides:
  - Email + password form (always visible)
  - "Sign in with email link" button (reveals magic link input)
  - "Forgot password?" link
- Mobile-friendly, minimal, and accessible.

### Maintenance Notes
- If adding new auth methods, update `/login` only.
- Keep guardrail comments in `/login/page.tsx` and NextAuth config.
- Review this file before making authentication changes.

---
### Known Failure Modes (Avoid)
- Protecting `/` or redirecting from `/` causes auth redirect loops.
- Missing `NEXTAUTH_URL` causes unpredictable redirects.
- Mixing App Router redirects with NextAuth redirects causes loops.

### Do Not
- Do not redirect users to `/api/auth/signin`
- Do not call NextAuth callbacks manually
- Do not add auth logic to `/`

_Last updated: December 15, 2025_
