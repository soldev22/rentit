import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { auditEvent } from "@/lib/audit";
import { MaintenancePriority } from "../maintenance/types";

export async function createMaintenanceRequest({
  propertyId,
  tenantId,
  title,
  description,
  priority,
}: {
  propertyId: string;
  tenantId: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
}) {
  const client = await clientPromise;
  const db = client.db();

  const now = new Date();
  const allowedPriorities: MaintenancePriority[] = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "EMERGENCY",
  ];

  if (!allowedPriorities.includes(priority)) {
    throw new Error("Invalid maintenance priority");
  }
  const tenancy = await db.collection("tenancies").findOne({
    propertyId: new ObjectId(propertyId),
    tenantId: new ObjectId(tenantId),
    status: "ACTIVE",
  });

  if (!tenancy) {
    throw new Error("Tenant is not assigned to this property");
  }

  const result = await db.collection("maintenance_projects").insertOne({
    propertyId: new ObjectId(propertyId),
    tenantId: new ObjectId(tenantId),
    title,
    description,
descriptionHistory: [
  {
    text: description,
    createdAt: now,
    createdBy: new ObjectId(tenantId),
    role: "TENANT",
  },
],
    priority,
    status: "REQUESTED",
    createdAt: now,
    updatedAt: now,
    createdBy: new ObjectId(tenantId),
  });

  // 🔒 AUDIT EVENT (this is the evidence)
  await auditEvent({
    action: "MAINTENANCE_REQUESTED",
    actorUserId: tenantId,
    propertyId,
    description: `Maintenance issue reported: ${title}`,
    metadata: {
      maintenanceId: result.insertedId.toString(),
      to: "REQUESTED",
    },
  });

  return {
    id: result.insertedId.toString(),
    status: "REQUESTED",
  };
}
