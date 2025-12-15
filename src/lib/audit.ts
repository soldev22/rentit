import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export type AuditAction =
  | "USER_REGISTERED"
  | "LOGIN"
  | "ROLE_ASSIGNED"

  // Password / auth
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"

  // Property & tenancy
  | "PROPERTY_CREATED"
  | "APPLICATION_SUBMITTED"
  | "APPLICATION_DECISION"
  | "TENANCY_STARTED"
  | "TENANCY_ENDED"

  // Maintenance
  | "MAINTENANCE_REQUESTED"
  | "MAINTENANCE_UPDATED"

  // Compliance & misc
  | "CERTIFICATE_UPLOADED"
  | "CHECKLIST_SUBMITTED"
  | "COMMENT_ADDED";

export interface AuditEventInput {
  action: AuditAction;
  actorUserId: string;

  targetUserId?: string;
  propertyId?: string;
  tenancyId?: string;
  maintenanceProjectId?: string;

  description: string;
  metadata?: Record<string, any>;
}

/**
 * Append-only audit log writer
 * NEVER update or delete audit records
 */
export async function auditEvent(input: AuditEventInput) {
  const client = await clientPromise;
  const db = client.db();

  await db.collection("audit_events").insertOne({
    ...input,
    actorUserId: new ObjectId(input.actorUserId),
    targetUserId: input.targetUserId
      ? new ObjectId(input.targetUserId)
      : undefined,
    createdAt: new Date(),
  });
}
