import clientPromise from "@/lib/mongodb";

export async function assignAgentToLandlord(agentId: string, landlordId: string) {
  const client = await clientPromise;
  const db = client.db();
  await db.collection("agentLandlords").updateOne(
    { agentId, landlordId },
    { $setOnInsert: { agentId, landlordId, createdAt: new Date() } },
    { upsert: true }
  );
}

export async function getLandlordIdsForAgent(agentId: string): Promise<string[]> {
  const client = await clientPromise;
  const db = client.db();
  const docs = await db.collection("agentLandlords").find({ agentId }).toArray();
  return docs.map((doc: any) => doc.landlordId);
}

export async function getAgentIdsForLandlord(landlordId: string): Promise<string[]> {
  const client = await clientPromise;
  const db = client.db();
  const docs = await db.collection("agentLandlords").find({ landlordId }).toArray();
  return docs.map((doc: any) => doc.agentId);
}
