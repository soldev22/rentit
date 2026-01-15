/**
 * Rentsimple Audit Event
 * - Append-only (never updated or deleted)
 * - Time-ordered record of all significant actions
 * - Used for legal escalation, reporting, and accountability
 */

export type AuditAction =
  | "USER_REGISTERED"
  | "LOGIN"
  | "LOGOUT"
  | "ROLE_ASSIGNED"
  | "API_REQUEST"
  | "PROPERTY_CREATED"
  | "VIEWING_SCHEDULED"
  | "TENANCY_COTENANT_ADDED"
  | "COMMUNICATION_SENT"
  | "APPLICATION_SUBMITTED"
  | "APPLICATION_DECISION"
  | "TENANCY_STARTED"
  | "TENANCY_ENDED"
  | "MAINTENANCE_REQUESTED"
  | "MAINTENANCE_UPDATED"
  | "CERTIFICATE_UPLOADED"
  | "CHECKLIST_SUBMITTED"
  | "COMMENT_ADDED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "ACCESS_DENIED"
  | "USER_INVITED"
  | "USER_INVITE_RESENT"
  | "USER_UPDATED"
  | "USER_UPDATE_FAILED";

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
