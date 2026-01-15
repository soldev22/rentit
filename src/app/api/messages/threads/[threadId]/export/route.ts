import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withApiAudit } from "@/lib/api/withApiAudit";
import { listMessagesForThread, toCsvValue } from "@/lib/comms";

async function exportThread(req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;
  if (!ObjectId.isValid(threadId)) {
    return NextResponse.json({ error: "Invalid thread id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();

  const userId = new ObjectId(session.user.id);
  const threadObjectId = new ObjectId(threadId);

  const messages = await listMessagesForThread({ threadId: threadObjectId, userId });

  if (format === "csv") {
    const header = ["createdAt", "senderRole", "kind", "subject", "body"].join(",");
    const rows = messages.map((m) =>
      [
        toCsvValue(m.createdAt.toISOString()),
        toCsvValue(m.senderRole ?? ""),
        toCsvValue(m.kind),
        toCsvValue(m.subject ?? ""),
        toCsvValue(m.body),
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=thread-${threadId}.csv`,
      },
    });
  }

  if (format === "pdf") {
    // Minimal PDF generation without extra dependencies: render a simple text-only PDF via a very small subset.
    // We generate a basic PDF file structure manually (sufficient for simple exports).
    const lines: string[] = [];
    lines.push(`Thread ${threadId}`);
    lines.push("");

    for (const m of messages) {
      const when = m.createdAt.toLocaleString();
      const head = `[${when}] ${m.senderRole ?? ""} ${m.kind.toUpperCase()} ${m.subject ?? ""}`.trim();
      lines.push(head);
      lines.push(m.body);
      lines.push(" ");
      lines.push("----------------------------------------");
      lines.push(" ");
    }

    // Very small, basic PDF text document.
    // Note: This is not meant for complex typography; it’s a pragmatic export.
    const text = lines.join("\n").replace(/\r/g, "");

    const escaped = text
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

    const stream = `BT\n/F1 10 Tf\n72 770 Td\n(${escaped.split("\n").join(") Tj\n0 -12 Td\n(")}) Tj\nET`;

    // PDF objects
    const objects: string[] = [];
    objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj");
    objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj");
    objects.push("3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources<< /Font<< /F1 4 0 R >> >> /Contents 5 0 R >>endobj");
    objects.push("4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj");
    objects.push(`5 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj`);

    // Build xref
    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];
    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += obj + "\n";
    }
    const xrefStart = pdf.length;
    pdf += "xref\n0 " + (objects.length + 1) + "\n";
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i < offsets.length; i++) {
      pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
    }
    pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=thread-${threadId}.pdf`,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}

export const GET = withApiAudit(exportThread);
