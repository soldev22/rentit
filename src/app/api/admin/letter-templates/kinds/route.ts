import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withApiAudit } from "@/lib/api/withApiAudit";
import { listLetterTemplateKinds } from "@/lib/letterTemplates";

function isAdminSession(session: any): session is { user: { id: string; role: "ADMIN" } } {
  return Boolean(session?.user?.id) && session.user.role === "ADMIN";
}

async function getKinds() {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const kinds = await listLetterTemplateKinds();
  return NextResponse.json({ ok: true, kinds });
}

export const GET = withApiAudit(getKinds, {
  description: () => "Admin listed letter template kinds",
});
