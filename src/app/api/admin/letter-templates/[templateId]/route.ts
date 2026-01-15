import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withApiAudit } from "@/lib/api/withApiAudit";
import { deleteLetterTemplateById, getLetterTemplateById } from "@/lib/letterTemplates";
import { deleteBlobIfExists, downloadTextFromBlob } from "@/lib/azureBlobText";

function isAdminSession(session: any): session is { user: { id: string; role: "ADMIN" } } {
  return Boolean(session?.user?.id) && session.user.role === "ADMIN";
}

async function getOne(_req: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { templateId } = await context.params;
  const template = await getLetterTemplateById(templateId);
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const text = await downloadTextFromBlob(template.blobName).catch(() => "");

  return NextResponse.json({ ok: true, template, text });
}

async function del(_req: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { templateId } = await context.params;
  const deleted = await deleteLetterTemplateById(templateId);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteBlobIfExists(deleted.blobName).catch(() => undefined);

  return NextResponse.json({ ok: true });
}

export const GET = withApiAudit(getOne, {
  description: () => "Admin viewed a letter template",
});

export const DELETE = withApiAudit(del, {
  description: () => "Admin deleted a letter template",
});
