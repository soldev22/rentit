import NextAuth, { type Session, type User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcrypt";
import { isRole, type Role } from "@/lib/roles"; // 🔧 ADD Role import
import { isUserStatus } from "@/lib/status";
import { auditEvent } from "@/lib/audit";
import crypto from "crypto";
import { ObjectId } from "mongodb";


export const authOptions = {
  session: {
    strategy: "jwt" as const,
  },

  events: {
    async signOut(message: any) {
      const token = message?.token as any | undefined;
      const session = message?.session as any | undefined;

      const actorUserId = (token?.id ?? token?.sub ?? session?.user?.id) as string | undefined;
      if (!actorUserId) return;

      const email = (token?.email ?? session?.user?.email) as string | undefined;
      const role = (token?.role ?? session?.user?.role) as string | undefined;

      await auditEvent({
        action: "LOGOUT",
        actorUserId,
        description: "User logout",
        source: "/api/auth/signout",
        metadata: {
          email,
          role,
        },
      }).catch(() => undefined);
    },
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Magic-link mode: signIn('credentials', { magic: 'true', token })
        const isMagic = String((credentials as any)?.magic ?? "") === "true";
        const magicToken = String((credentials as any)?.token ?? "").trim();

        const client = await clientPromise;
        const db = client.db();

        if (isMagic) {
          if (!magicToken) return null;

          const tokenHash = crypto.createHash("sha256").update(magicToken).digest("hex");
          const record: any = await db.collection("password_resets").findOne({
            tokenHash,
            used: { $ne: true },
            expiresAt: { $gt: new Date() },
            type: "magic-link",
          });

          if (!record) return null;

          await db.collection("password_resets").updateOne(
            { _id: record._id },
            { $set: { used: true, usedAt: new Date() } }
          );

          const lookupEmail = record.email ? String(record.email).trim().toLowerCase() : null;
          const userQuery = lookupEmail
            ? { email: new RegExp(`^${escapeRegex(lookupEmail)}$`, "i") }
            : record.userId && ObjectId.isValid(String(record.userId))
              ? { _id: new ObjectId(String(record.userId)) }
              : null;

          if (!userQuery) return null;

          const dbUser: any = await db.collection("users").findOne(userQuery);
          if (!dbUser) return null;

          if (dbUser.status === "PAUSED") return null;
          if (!isRole(dbUser.role)) return null;

          const status = isUserStatus(dbUser.status) ? dbUser.status : "ACTIVE";

          await auditEvent({
            action: "LOGIN",
            actorUserId: dbUser._id.toString(),
            description: "User login (magic link)",
            source: "/api/auth/[...nextauth]",
            metadata: { email: dbUser.email, role: dbUser.role },
          }).catch(() => undefined);

          return {
            id: dbUser._id.toString(),
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            status,
          };
        }

        // Password mode
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = String(credentials.email).trim().toLowerCase();
        if (!normalizedEmail) return null;

        const dbUser: any = await db.collection("users").findOne({
          email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i"),
        });

        if (!dbUser || !dbUser.hashedPassword) {
          return null;
        }

        // ⛔ Block paused users
        if (dbUser.status === "PAUSED") {
          console.log("LOGIN BLOCKED (PAUSED):", dbUser.email);
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          dbUser.hashedPassword
        );

        if (!isValid) {
          return null;
        }

        // 🔧 VALIDATE + NARROW ROLE (this fixes your error)
        if (!isRole(dbUser.role)) {
          console.error("INVALID ROLE IN DB:", dbUser.role);
          return null;
        }
const status = isUserStatus(dbUser.status)
  ? dbUser.status
  : "ACTIVE";

        console.log("AUTHORIZE USER:", {
          email: dbUser.email,
          role: dbUser.role,
          status: dbUser.status ?? "ACTIVE",
        });

        await auditEvent({
          action: "LOGIN",
          actorUserId: dbUser._id.toString(),
          description: "User login",
          source: "/api/auth/[...nextauth]",
          metadata: {
            email: dbUser.email,
            role: dbUser.role,
          },
        }).catch(() => undefined);

     return {
  id: dbUser._id.toString(),
  email: dbUser.email,
  name: dbUser.name,
  role: dbUser.role,
  status, // now typed as UserStatus
};

      },
    }),
  ],

  callbacks: {
    async jwt({
      token,
      user,
    }: {
      token: JWT;
      user?: User;
    }) {
      if (user) {
        token.id = (user as any).id; // ✅ REQUIRED
        token.role = (user as any).role as Role; // 🔧 narrow once
        token.name = user.name;
        token.status = (user as any).status ?? "ACTIVE";
      }
      return token;
    },

    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }) {
      if (!session.user) {
        // Extremely defensive – should never happen
        return session;
      }

      session.user.id = (token as any).id as string;
      session.user.role = token.role as Role; // 🔧 FIXED
      session.user.name = token.name as string;
     session.user.status = token.status ?? "ACTIVE";


      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
