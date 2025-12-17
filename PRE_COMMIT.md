# PRE_COMMIT.md

See AUTH_PATTERN.md for authoritative auth and role rules.


This checklist must be followed **before every commit**.
It exists to prevent auth, routing, and role regressions.

This is a **human guardrail**, not automation.

---

## 60-Second Pre-Commit Checklist

### 1. Auth & Roles (Critical)

- [ ] I did NOT add inline role checks in pages  
  (no `session.user.role !== ...` in `page.tsx`)
- [ ] I used `requireRole()` or a layout guard instead
- [ ] I did NOT add auth logic to client components
- [ ] I did NOT protect `/` or `/login`

If auth or roles changed:
- [ ] I updated `AUTH_PATTERN.md`

---

### 2. Routing & Layouts

- [ ] New protected routes live under a role folder (`/admin`, `/agent`, `/landlord`)
- [ ] Role protection is enforced in `layout.tsx`, not pages
- [ ] I did NOT hard-code role redirects in pages

---

### 3. Registration & User Creation

- [ ] Public registration does NOT allow staff roles
- [ ] Roles are never accepted from the client
- [ ] Staff users are created or assigned by ADMIN only

---

### 4. Redirects & Navigation

- [ ] Post-login redirects are centralised
- [ ] I did NOT link to `/api/auth/signin`
- [ ] Logout uses `signOut({ callbackUrl })`

---

### 5. Quick Sanity Search (Optional but Recommended)

Before committing, run these searches:

session.user?.role !==
redirect("/admin
"use client"
as any



If something looks suspicious — stop and review.

---

## If This Checklist Feels Annoying

That means it’s working.

Most serious regressions come from:
- rushed fixes
- duplicated role logic
- “just one small redirect change”

This checklist exists to stop that.

---

## Rule of Thumb

> If a change touches auth, roles, or routing — slow down.

Infrastructure changes are deliberate by design.

---

_Last updated: December 2025_