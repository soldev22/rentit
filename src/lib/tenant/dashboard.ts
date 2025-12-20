// src/lib/tenant/dashboard.ts
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

function formatDate(d: Date) {
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}
// lib/tenant/dashboard.ts

export async function getTenantIssueById(
  tenantId: string,
  issueId: string
) {
  const data = await getTenantDashboardData(tenantId);

  const issue = data.issues.find((i) => i.id === issueId);

  if (!issue) {
    return null;
  }

  return issue;
}

export async function getTenantDashboardData(tenantId: string) {
  const client = await clientPromise;
  const db = client.db();

  const tenancy = await db.collection("tenancies").findOne({
    tenantId: new ObjectId(tenantId),
    status: "ACTIVE",
  });

  if (!tenancy) {
    return {
      activeTenancy: null as any,
      propertyLabel: "",
      startDateLabel: "",
      issues: [] as Array<any>,
    };
  }

  const property = await db.collection("properties").findOne({
    _id: tenancy.propertyId,
  });

  const propertyLabel =
    property?.address?.line1
      ? `${property.address.line1}, ${property.address.city ?? ""} ${property.address.postcode ?? ""}`.trim()
      : property?.title ?? "Property";

  const issuesCursor = db
    .collection("maintenance_projects")
    .find({
      tenantId: new ObjectId(tenantId),
      propertyId: tenancy.propertyId,
    })
    .sort({ createdAt: -1 })
    .limit(10);

  const issuesRaw = await issuesCursor.toArray();

  const issues = issuesRaw.map((i: any) => ({
    id: i._id.toString(),
    title: i.title,
    status: i.status,
    createdAtLabel: i.createdAt ? formatDate(new Date(i.createdAt)) : "",
  }));

  return {
    activeTenancy: {
      id: tenancy._id.toString(),
      propertyId: tenancy.propertyId.toString(),
    },
    propertyLabel,
    startDateLabel: tenancy.createdAt ? formatDate(new Date(tenancy.createdAt)) : "",
    issues,
  };
}

export async function getTenantIssueDetailById(
  tenantId: string,
  issueId: string
) {
  const client = await clientPromise;
  const db = client.db();

  const issue = await db.collection("maintenance_projects").findOne({
    _id: new ObjectId(issueId),
    tenantId: new ObjectId(tenantId),
  });

  if (!issue) {
    return null;
  }

  return {
    id: issue._id.toString(),
    title: issue.title,
    description: issue.description,
    descriptionHistory: (issue.descriptionHistory ?? []).map((entry: any) => ({
      ...entry,
      createdAtLabel: entry.createdAt ? formatDate(new Date(entry.createdAt)) : ""
    })),
    status: issue.status,
    priority: issue.priority,
    createdAtLabel: issue.createdAt
      ? formatDate(new Date(issue.createdAt))
      : "",
  };
}
