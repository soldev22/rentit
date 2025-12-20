import NextAuth, { type Session, type User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcrypt";
import { isRole, type Role } from "@/lib/roles"; // 🔧 ADD Role import
import { isUserStatus } from "@/lib/status";


export const authOptions = {
  session: {
    strategy: "jwt" as const,
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const client = await clientPromise;
        const db = client.db();

        const dbUser: any = await db.collection("users").findOne({
          email: credentials.email,
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
