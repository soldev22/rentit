import { DefaultSession, DefaultUser } from "next-auth";

/**
 * Single source of truth for roles
 */
export type AppRole =
  | "ADMIN"
  | "TENANT"
  | "LANDLORD"
  | "AGENT"
  | "APPLICANT"
  | "TRADESPERSON"
  | "ACCOUNTANT";

export type UserStatus = "ACTIVE" | "PAUSED";

/**
 * NextAuth session + user augmentation
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      status: UserStatus;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: AppRole;
    status: UserStatus;
  }
}

/**
 * JWT augmentation
 */
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    status: UserStatus;
  }
}
