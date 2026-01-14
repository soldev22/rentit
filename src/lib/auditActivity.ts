export type AuditActivityInput = {
  action?: string;
  description?: string;
  source?: string | null;
  success?: boolean;
  metadata?: Record<string, unknown> | null;
  propertyId?: string | null;
  tenancyId?: string | null;
  targetUserId?: string | null;
  maintenanceProjectId?: string | null;
};

type AuditMetadata = {
  method?: unknown;
  path?: unknown;
};

function normalizePath(pathname: string): string {
  return pathname
    .replace(/\b[0-9a-f]{24}\b/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:id');
}

/**
 * Human-readable activity line for audit events.
 *
 * Goal: give admins a quick “what happened” summary even for generic API_REQUEST logs.
 * Safe fallback: uses existing `description` or method/path.
 */
export function formatAuditActivity(event: AuditActivityInput): string {
  const action = event.action ?? '';

  // If the event already has a meaningful description, prefer it.
  // Many explicit actions (LOGIN, USER_REGISTERED, etc) are written with good copy.
  if (action && action !== 'API_REQUEST' && event.description?.trim()) {
    return event.description.trim();
  }

  const metadata: AuditMetadata = event.metadata ?? {};
  const method = typeof metadata.method === 'string' ? metadata.method.toUpperCase() : '';
  const pathRaw = typeof metadata.path === 'string' ? metadata.path.trim() : String(event.source ?? '').trim();
  const path = normalizePath(pathRaw);

  // API_REQUEST: infer “what happened” from method+route
  if (action === 'API_REQUEST') {
    // Tenancy applications
    if (method === 'POST' && path === '/api/tenancy-applications') {
      return 'Submitted tenancy application';
    }
    if (method === 'GET' && path === '/api/tenancy-applications') {
      return 'Viewed tenancy applications';
    }
    if (method === 'GET' && path === '/api/tenancy-applications/:id') {
      return 'Viewed tenancy application';
    }
    if (method === 'PATCH' && path === '/api/tenancy-applications/:id') {
      return 'Updated tenancy application';
    }
    if (method === 'DELETE' && path === '/api/tenancy-applications/:id') {
      return 'Deleted tenancy application';
    }

    if (method === 'POST' && path === '/api/tenancy-applications/:id/schedule-viewing') {
      return 'Scheduled viewing';
    }
    if (method === 'POST' && path === '/api/tenancy-applications/:id/background-check-request') {
      return 'Sent background check request';
    }
    if (method === 'POST' && path === '/api/tenancy-applications/:id/credit-check') {
      return 'Recorded credit check';
    }
    if (method === 'POST' && path === '/api/tenancy-applications/:id/employer-verification-request') {
      return 'Requested employer reference';
    }
    if (method === 'POST' && path === '/api/tenancy-applications/:id/landlord-reference-request') {
      return 'Requested landlord reference';
    }

    // Properties (landlord)
    if (method === 'POST' && path === '/api/landlord/properties') {
      return 'Created property';
    }
    if (method === 'POST' && path === '/api/landlord/properties/:id/photos') {
      return 'Uploaded property photos';
    }
    if (method === 'POST' && path === '/api/landlord/properties/:id/photos/hero') {
      return 'Set property hero photo';
    }
    if (method === 'POST' && path === '/api/landlord/properties/:id/status') {
      return 'Changed property status';
    }
    if (method === 'PUT' && path === '/api/landlord/properties/update') {
      return 'Updated property';
    }

    // Maintenance
    if (method === 'POST' && path === '/api/maintenance') {
      return 'Created maintenance request';
    }
    if (method === 'PATCH' && path === '/api/maintenance/:id') {
      return 'Updated maintenance request';
    }

    // Admin
    if (method === 'GET' && path === '/api/admin/audit') {
      return 'Viewed audit log';
    }
    if (method === 'POST' && path === '/api/admin/users/invite') {
      return 'Invited user';
    }
    if (method === 'PATCH' && path === '/api/admin/users/:id') {
      return 'Updated user';
    }

    // Default fallback for API_REQUEST
    if (method && pathRaw) return `${method} ${pathRaw}`;
  }

  // Generic fallback for anything else
  if (event.description?.trim()) return event.description.trim();
  if (method && pathRaw) return `${method} ${pathRaw}`;
  return action || 'Activity';
}
