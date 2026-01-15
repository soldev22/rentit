import clientPromise from "@/lib/mongodb";

export async function getUserByEmail(email: string) {
  const client = await clientPromise;
  const db = client.db();
  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const normalizedEmail = String(email).trim().toLowerCase();
  return db
    .collection("users")
    .findOne({ email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i") });
}
