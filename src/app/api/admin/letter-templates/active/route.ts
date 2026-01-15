import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withApiAudit } from "@/lib/api/withApiAudit";
import {
  getActiveLetterTemplateId,
  getLetterTemplateById,
  setActiveLetterTemplateId,
  type LetterTemplateChannel,
  type LetterTemplateKind,
} from "@/lib/letterTemplates";

function isAdminSession(session: any): session is { user: { id: string; role: "ADMIN" } } {
  return Boolean(session?.user?.id) && session.user.role === "ADMIN";
}

function normalizeKind(raw: string | null): LetterTemplateKind | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (value.length > 64) return null;
  if (!/^[A-Z0-9_]+$/.test(value)) return null;
  return value;
}

function normalizeChannel(raw: string | null): LetterTemplateChannel {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "sms" ? "sms" : "email";
}

async function getActive(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const url = new URL(req.url);
  const kind = normalizeKind(url.searchParams.get("kind"));
  if (!kind) return NextResponse.json({ error: "kind is required" }, { status: 400 });

  const channel = normalizeChannel(url.searchParams.get("channel"));

  const templateId = await getActiveLetterTemplateId({ kind, channel });
  return NextResponse.json({ ok: true, kind, channel, templateId });
}

const PutSchema = z.object({
  kind: z.string().trim().min(1).max(64),
  channel: z.enum(["email", "sms"]),
  templateId: z.string().trim().nullable(),
});

async function putActive(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const kind = normalizeKind(parsed.data.kind);
  if (!kind) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });

  const channel = normalizeChannel(parsed.data.channel);

  if (parsed.data.templateId) {
    const template = await getLetterTemplateById(parsed.data.templateId);
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    if (template.kind !== kind) {
      return NextResponse.json({ error: "Template kind mismatch" }, { status: 409 });
    }
    if (template.channel !== channel) {
      return NextResponse.json({ error: "Template channel mismatch" }, { status: 409 });
    }
  }

  const res = await setActiveLetterTemplateId({
    kind,
    channel,
    templateId: parsed.data.templateId,
    actorUserId: session.user.id,
  });

  return NextResponse.json({ ok: true, kind, channel, templateId: res.templateId });
}

export const GET = withApiAudit(getActive, {
  description: () => "Admin fetched active proceed-letter template",
});

export const PUT = withApiAudit(putActive, {
  description: () => "Admin updated active proceed-letter template",
});
