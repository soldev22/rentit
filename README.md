
# Rentsimple — Multi-Role Rental Platform

⚠️ Auth and roles are opinionated. Read AUTH_PATTERN.md before making changes.

Rentsimple is a modern, multi-role rental management platform built with
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

- <http://localhost:3000>

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

- Next.js — [https://nextjs.org/docs](https://nextjs.org/docs)
- NextAuth.js — [https://next-auth.js.org](https://next-auth.js.org)
- MongoDB — [https://mongodb.com/docs](https://mongodb.com/docs)

---

## 🔔 Notification System

Rentsimple includes a comprehensive multi-channel notification system supporting **Email** and **SMS**. **WhatsApp** notifications are currently commented out except for the permissions page.

### Features

- **User Preferences**: Users can choose their preferred contact methods in their profile
- **Automatic Triggers**: Notifications sent for key application events
- **Multi-Channel**: Simultaneous delivery via enabled methods
- **Graceful Fallback**: System continues working even if some channels fail

### Supported Notification Events

- ✅ Application submitted
- ✅ Viewing request approved/declined
- ✅ Background checks approved/declined
- ✅ Credit check completed
- ✅ Documents sent
- ✅ Documents signed
- ✅ Tenancy confirmed
- ✅ Tenancy completed

### Setup SMS & WhatsApp

**Note:** WhatsApp notifications are currently commented out in the codebase except for the permissions page. To enable WhatsApp:

1. **Create Twilio Account**: Sign up at [twilio.com](https://twilio.com)
2. **Get API Credentials**: Copy your Account SID and Auth Token
3. **Purchase Phone Numbers**: Get SMS and WhatsApp-enabled numbers
4. **Configure Environment**:

   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   TWILIO_WHATSAPP_NUMBER=+1234567890
   ```

5. **Enable WhatsApp**: Follow Twilio's WhatsApp setup guide
6. **Uncomment WhatsApp code**: Remove comment blocks in `src/lib/notification.ts` and `scripts/test-notifications.ts`

### Usage

```typescript
import { notificationService } from '@/lib/notification';

// Send to user based on preferences
await notificationService.sendToUser(
  userEmail,
  userPhone,
  contactPreferences,
  'Subject',
  'Message'
);
```

---

© 2025 Rentsimple. All rights reserved.
