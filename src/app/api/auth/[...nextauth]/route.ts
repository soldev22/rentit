// AUTH PATTERN
// Uses custom /login page.
// Do not add auth UI outside /login.
// See AUTH_PATTERN.md.
import NextAuth, { type AuthOptions } from "next-auth";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import resend from "@/lib/resend";
import { compare } from "bcrypt";
import { z } from "zod";
import { getUserByEmail } from "@/lib/user";
import { getPrimaryRole } from "@/lib/roles";
import type { AppRole } from "@/types/next-auth"; // add at top if not present

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
       // Standard email/password login only
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
         return null;
        }

        const { email, password } = parsed.data;
        const user = await getUserByEmail(email);
        if (!user) {
         return null;
        }
        if (!user.hashedPassword) {
          return null;
        }

        const isValid = await compare(password, user.hashedPassword);
        if (!isValid) {
         return null;
        }

        const id = user._id?.toString();
        if (!id) {
          return null;
        }

        const role = await getPrimaryRole(id);
        const result = {
          id,
          email: user.email,
          name: user.name,
          role: role?.trim() || undefined,
        };
         return result as any;
      },
    }),
    EmailProvider({
      from: "RentIT <no-reply@solutionsdeveloped.co.uk>",
      maxAge: 15 * 60, // 15 minutes
      async sendVerificationRequest({ identifier, url }) {
        await resend.emails.send({
          from: "RentIT <no-reply@solutionsdeveloped.co.uk>",
          to: identifier,
          subject: "Your sign-in link for RentIT",
          html: `<p>Click the link below to sign in:</p><p><a href="${url}">${url}</a></p>`
        });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.name = token.name as string;
        session.user.role = token.role as AppRole;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
