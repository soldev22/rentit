import NextAuth, { type Session, type User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcrypt";

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

        // ✅ Block paused users BEFORE password check (optional, but clean)
        if (dbUser.status === "PAUSED") {
          console.log("LOGIN BLOCKED (PAUSED):", { email: dbUser.email });
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          dbUser.hashedPassword
        );

        if (!isValid) {
          return null;
        }

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
          status: dbUser.status ?? "ACTIVE",
        } as any;
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
      // First login: copy fields from user onto token
      if (user) {
        token.role = (user as any).role;
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
      // ✅ Optional: block existing sessions if user gets paused later
      // (This will force them to re-auth and fail)
      if ((token as any).status === "PAUSED") {
        return {
          ...session,
          user: {
            ...session.user,
            role: token.role as string,
            name: token.name as string,
            status: "PAUSED",
          },
        };
      }

      return {
        ...session,
        user: {
          ...session.user,
          role: token.role as string,
          name: token.name as string,
          status: ((token as any).status as string) ?? "ACTIVE",
        },
      };
    },
  },

  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
