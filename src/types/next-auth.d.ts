import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      name?: string;
      email?: string;
      role?: string;
      [key: string]: any;
    } & DefaultSession["user"];
  }
  interface User extends DefaultUser {
    role?: string;
    name?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    name?: string;
  }
}
