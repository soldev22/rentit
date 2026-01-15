import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withApiAudit } from "@/lib/api/withApiAudit";
import {
  createLetterTemplate,
  getActiveLetterTemplateId,
  listLetterTemplates,
  type LetterTemplateChannel,
  type LetterTemplateKind,
} from "@/lib/letterTemplates";
import { uploadTextTemplateToBlob } from "@/lib/azureBlobText";

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

function isAdminSession(session: any): session is { user: { id: string; role: "ADMIN" } } {
  return Boolean(session?.user?.id) && session.user.role === "ADMIN";
}

async function getTemplates(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const url = new URL(req.url);
  const rawKind = url.searchParams.get("kind");
  const kindFromQuery = normalizeKind(rawKind);
  if (rawKind && !kindFromQuery) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  const resolvedKind = (kindFromQuery ?? "TENANCY_PROCEED_LETTER") as LetterTemplateKind;

  const channel = normalizeChannel(url.searchParams.get("channel"));

  const [templates, activeTemplateId] = await Promise.all([
    listLetterTemplates({ kind: resolvedKind, channel }),
    getActiveLetterTemplateId({ kind: resolvedKind, channel }),
  ]);

  return NextResponse.json({ ok: true, kind: resolvedKind, channel, activeTemplateId, templates });
}

async function postTemplate(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const kindRaw = form.get("kind");
  const kind = normalizeKind(typeof kindRaw === "string" ? kindRaw : null);
  if (!kind) return NextResponse.json({ error: "Template kind is required (A-Z, 0-9, underscore)." }, { status: 400 });

  const channelRaw = form.get("channel");
  const channel = normalizeChannel(typeof channelRaw === "string" ? channelRaw : null);

  const nameRaw = form.get("name");
  const file = form.get("file");

  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
  if (!name) return NextResponse.json({ error: "Template name is required" }, { status: 400 });

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const filename = file.name || "template.txt";
  const contentType = file.type || "text/plain";

  // Only accept text templates for now (these are emailed as plain text)
  const allowedTypes = new Set([
    "text/plain",
    "text/markdown",
    "text/x-markdown",
    "application/octet-stream", // browsers sometimes send this for .txt
  ]);

  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const allowedExts = new Set(["txt", "md"]);

  if (!allowedTypes.has(contentType) && !allowedExts.has(ext)) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a .txt or .md file." },
      { status: 415 }
    );
  }

  const text = await file.text();
  const trimmed = text.trim();
  if (!trimmed) return NextResponse.json({ error: "Template file is empty" }, { status: 400 });
  if (trimmed.length > 50000) return NextResponse.json({ error: "Template too large" }, { status: 413 });

  const { blobName } = await uploadTextTemplateToBlob({
    kindPath: `letter-templates/${kind.toLowerCase().replaceAll("_", "-")}/${channel}`,
    originalFilename: filename,
    text,
  });

  const doc = await createLetterTemplate({
    kind,
    channel,
    name,
    blobName,
    contentType: "text/plain",
    actorUserId: session.user.id,
  });

  return NextResponse.json({ ok: true, template: doc });
}

export const GET = withApiAudit(getTemplates, {
  description: () => "Admin listed letter templates",
});

export const POST = withApiAudit(postTemplate, {
  description: () => "Admin uploaded a letter template",
});
