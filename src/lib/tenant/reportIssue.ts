// src/lib/tenant/reportIssue.ts
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export async function getTenantPropertiesForIssue(tenantId: string) {
  const client = await clientPromise;
  const db = client.db();

  const tenancies = await db
    .collection("tenancies")
    .find({ tenantId: new ObjectId(tenantId), status: "ACTIVE" })
    .toArray();

  if (tenancies.length === 0) return [];

  const propertyIds = tenancies.map((t: any) => t.propertyId);

  const properties = await db
    .collection("properties")
    .find({ _id: { $in: propertyIds } })
    .toArray();

  return properties.map((p: any) => {
    const label =
      p?.address?.line1
        ? `${p.address.line1}, ${p.address.city ?? ""} ${p.address.postcode ?? ""}`.trim()
        : p?.title ?? "Property";

    return { id: p._id.toString(), label };
  });
}
