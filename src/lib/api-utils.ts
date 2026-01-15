import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * Throws or returns a NextResponse if session is missing or user is not active.
 */
export async function requireSession(_req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (session.user.status && session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "User is not active" }, { status: 403 });
  }
  return session;
}


/**
 * Throws or returns a NextResponse if user does not have required role.
 */
export function requireRole(session: any, role: string) {
  if (!session.user || session.user.role !== role) {
    return NextResponse.json({ error: `Role ${session.user.role} not allowed` }, { status: 403 });
  }
}

/**
 * Validates a MongoDB ObjectId, returns NextResponse if invalid.
 */
export function validateObjectId(id: string, name = "id") {
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: `Invalid ${name}` }, { status: 400 });
  }
}

/**
 * Checks for duplicate in a collection, returns NextResponse if found.
 */
export async function checkDuplicate(collection: any, query: any, errorMsg: string, status = 409) {
  const existing = await collection.findOne(query);
  if (existing) {
    return NextResponse.json({ error: errorMsg }, { status });
  }
}
