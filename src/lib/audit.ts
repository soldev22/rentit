import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export type AuditAction =
  | "USER_REGISTERED"
  | "LOGIN"
  | "LOGOUT"
  | "ROLE_ASSIGNED"

  // Generic activity
  | "API_REQUEST"

  // Password / auth
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"

  // Admin / security
  | "ACCESS_DENIED"
  | "USER_INVITED"
  | "USER_INVITE_RESENT"
  | "USER_UPDATED"
  | "USER_UPDATE_FAILED"

  // Property & tenancy
  | "PROPERTY_CREATED"
  | "VIEWING_REQUESTED"
  | "VIEWING_SCHEDULED"
  | "VIEWING_OCCURRED_RECORDED"
  | "TENANCY_COTENANT_ADDED"
  | "COMMUNICATION_SENT"
  | "VIEWING_CHECKLIST_SENT"
  | "VIEWING_CHECKLIST_UNLOCKED"
  | "VIEWING_CHECKLIST_UPDATED"
  | "VIEWING_CONFIRMATION_RECORDED"
  | "TENANCY_PROCEED_LETTER_SENT"
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
  tenancyApplicationId?: string;
  tenancyId?: string;
  maintenanceProjectId?: string;

  description: string;
  metadata?: Record<string, any>;

  // NEW (optional, critical)
  success?: boolean;
  source?: string;        // api/admin/users/[id]
  errorCode?: string;     // UNAUTHORIZED, VALIDATION_ERROR
  errorMessage?: string;  // stack / message
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
  actorUserId: input.actorUserId, // store as string
  targetUserId: ObjectId.isValid(input.targetUserId ?? "")
    ? new ObjectId(input.targetUserId!)
    : input.targetUserId ?? null,
  tenancyApplicationId: ObjectId.isValid(input.tenancyApplicationId ?? "")
    ? new ObjectId(input.tenancyApplicationId!)
    : input.tenancyApplicationId ?? null,
  success: input.success ?? true,
  source: input.source ?? null,
  errorCode: input.errorCode ?? null,
  errorMessage: input.errorMessage ?? null,
  createdAt: new Date(),
});


}
