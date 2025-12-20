import clientPromise from "@/lib/mongodb";

export type RoleType = "APPLICANT" | "TENANT" | "LANDLORD" | "TRADESPERSON" | "ACCOUNTANT" | "ADMIN" | "AGENT";

export async function getUserRoles(userId: string) {
  const client = await clientPromise;
  const db = client.db();

  return db
    .collection<{ role: RoleType }>("roles")
    .find({ userId })
    .toArray();
}
export const ROLES = ["ADMIN", "LANDLORD", "TENANT", "APPLICANT"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}


export async function getPrimaryRole(userId: string): Promise<RoleType | null> {
  const client = await clientPromise;
  const db = client.db();

  const role = await db
    .collection<{ role: RoleType }>("roles")
    .findOne({ userId });

  return role?.role ?? null;
}
