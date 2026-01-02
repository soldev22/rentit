/**
 * MongoDB connection and helpers for Rentsimple
 */
import clientPromise from "@/lib/mongodb";
import { Db, Collection, Document } from "mongodb";

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db();
}

export async function getCollection<T extends Document = Document>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}
