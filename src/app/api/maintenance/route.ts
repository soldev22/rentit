import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createMaintenanceRequest } from "@/lib/maintenance/transitions";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  console.log("Session in /api/maintenance:", session);

 if (!session || !session.user) {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

if (session.user.role !== "TENANT") {
  return NextResponse.json(
    { error: `Role ${session.user.role} cannot raise maintenance` },
    { status: 403 }
  );
}

if (session.user.status !== "ACTIVE") {
  return NextResponse.json(
    { error: "User is not active" },
    { status: 403 }
  );
}

if (!session.user.id) {
  return NextResponse.json(
    { error: "Session user id missing" },
    { status: 500 }
  );
}


  const body = await req.json();
  const { propertyId, title, description, priority } = body;

  if (!propertyId || !title || !description || !priority) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const result = await createMaintenanceRequest({
    propertyId,
    tenantId: session.user.id, // ← important
    title,
    description,
    priority,
  });

  return NextResponse.json({ ok: true, maintenance: result });
}
