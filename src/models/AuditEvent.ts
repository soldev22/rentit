/**
 * Rentsimple Audit Event
 * - Append-only (never updated or deleted)
 * - Time-ordered record of all significant actions
 * - Used for legal escalation, reporting, and accountability
 */

export type AuditAction =
  | "USER_REGISTERED"
  | "LOGIN"
  | "ROLE_ASSIGNED"
  | "PROPERTY_CREATED"
  | "APPLICATION_SUBMITTED"
  | "APPLICATION_DECISION"
  | "TENANCY_STARTED"
  | "TENANCY_ENDED"
  | "MAINTENANCE_REQUESTED"
  | "MAINTENANCE_UPDATED"
  | "CERTIFICATE_UPLOADED"
  | "CHECKLIST_SUBMITTED"
  | "COMMENT_ADDED";

export interface AuditEvent {
  _id?: string;

  action: AuditAction;

  actorUserId: string;

  // What this action relates to
  propertyId?: string;
  tenancyId?: string;
  targetUserId?: string;
  maintenanceProjectId?: string;

  description: string;

  metadata?: Record<string, any>;

  createdAt: Date;
}
