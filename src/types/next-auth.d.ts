import { DefaultSession, DefaultUser } from "next-auth";

export type AppRole =
  | "ADMIN"
  | "TENANT"
  | "LANDLORD"
  | "AGENT"
  | "APPLICANT"
  | "TRADESPERSON"
  | "ACCOUNTANT";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      name?: string;
      email?: string;
      role?: AppRole;
      [key: string]: any;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: AppRole;
    name?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
    name?: string;
  }
}
