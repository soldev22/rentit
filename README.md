
# RentIT: Multi-Role Rental Platform

This is a Next.js 13+ (App Router, TypeScript) project for a multi-role rental platform supporting Admin, Landlord, Tenant, Applicant, Tradesperson, and Accountant experiences. It uses MongoDB, NextAuth.js, and Tailwind CSS.

## Getting Started


## Getting Started

1. Install dependencies:
	```bash
	npm install
	```
2. Create a `.env.local` file with your MongoDB URI and NextAuth secret:
	```env
	MONGODB_URI=your-mongodb-uri
	NEXTAUTH_SECRET=your-random-secret
	```
3. Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


Open [http://localhost:3000](http://localhost:3000) to use the app.

## Features

- Role-based dashboards: Landlord, Tenant, Applicant, Tradesperson, Accountant, Admin
- Secure authentication with NextAuth.js (credentials provider, JWT, MongoDBAdapter)
- Roles are stored in a dedicated `roles` collection (not on the user object)
- Registration flow allows selection of any role
- Session and dashboard logic always fetches the latest role from the DB
- Audit logging for user registration and role changes
- Modern, mobile-first UI with Tailwind CSS and Geist font

## Architecture & Conventions

- All role checks go through `src/lib/roles.ts`
- Registration creates the user's first role in the `roles` collection
- Session includes the user's primary role for UI display (badge in header)
- Dashboards and protected pages check both session and DB for role
- See `.github/copilot-instructions.md` for AI agent onboarding


## Development

- Lint: `npm run lint`
- Build: `npm run build`
- Start: `npm run start`
- Dev: `npm run dev`

## Environment

- Requires `MONGODB_URI` and `NEXTAUTH_SECRET` in `.env.local`
- Designed for Vercel, but runs anywhere Next.js is supported

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [MongoDB Documentation](https://mongodb.com/docs/)

---

© 2025 RentIT. All rights reserved.