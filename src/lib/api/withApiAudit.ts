import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { auditEvent, type AuditAction } from "@/lib/audit";
import { formatAuditActivity } from "@/lib/auditActivity";

type RouteHandler<Req extends Request = Request, Ctx = unknown> = (
  req: Req,
  ctx: Ctx
) => Promise<Response> | Response;

type WithApiAuditOptions<Req extends Request, Ctx> = {
  action?: AuditAction;
  description?: (req: Req, ctx: Ctx) => string;
};

/**
 * Wrap a Next.js route handler to write an audit event for authenticated users.
 *
 * Notes:
 * - Best-effort: audit failures never fail the request.
 * - Does not log request bodies/params (only method/path + timing).
 */
export function withApiAudit<Req extends Request = Request, Ctx = unknown>(
  handler: RouteHandler<Req, Ctx>,
  options?: WithApiAuditOptions<Req, Ctx>
): RouteHandler<Req, Ctx> {
  return async (req, ctx) => {
    const startedAt = Date.now();

    const url = (() => {
      try {
        return new URL(req.url);
      } catch {
        return null;
      }
    })();

    // Best-effort session lookup (some routes do their own auth too)
    const session = await getServerSession(authOptions).catch(() => null);
    const actorUserId = session?.user?.id;

    try {
      const response = await handler(req, ctx);

      if (actorUserId) {
        const durationMs = Date.now() - startedAt;
        const pathname = url?.pathname ?? "";

        const action = options?.action ?? "API_REQUEST";
        const defaultDescription = formatAuditActivity({
          action,
          source: pathname,
          metadata: {
            method: req.method,
            path: pathname,
          },
        });

        await auditEvent({
          action,
          actorUserId,
          description: options?.description
            ? options.description(req, ctx)
            : defaultDescription,
          source: pathname,
          success: response.status < 400,
          metadata: {
            method: req.method,
            path: pathname,
            status: response.status,
            durationMs,
            queryKeys: url ? Array.from(url.searchParams.keys()) : [],
            userAgent: req.headers.get("user-agent"),
          },
        }).catch(() => undefined);
      }

      return response;
    } catch (err: unknown) {
      if (actorUserId) {
        const durationMs = Date.now() - startedAt;
        const pathname = url?.pathname ?? "";

        const action = options?.action ?? "API_REQUEST";
        const defaultDescription = formatAuditActivity({
          action,
          source: pathname,
          metadata: {
            method: req.method,
            path: pathname,
          },
        });

        const errorMessage =
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : "Unknown error";

        await auditEvent({
          action,
          actorUserId,
          description: options?.description
            ? options.description(req, ctx)
            : defaultDescription,
          source: pathname,
          success: false,
          errorCode: "UNHANDLED_EXCEPTION",
          errorMessage,
          metadata: {
            method: req.method,
            path: pathname,
            durationMs,
            queryKeys: url ? Array.from(url.searchParams.keys()) : [],
            userAgent: req.headers.get("user-agent"),
          },
        }).catch(() => undefined);
      }

      throw err;
    }
  };
}
