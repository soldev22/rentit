import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export async function getIssueDetailForManager(issueId: string) {
  const client = await clientPromise;
  const db = client.db();

  const issue = await db.collection("maintenance_projects").findOne({
    _id: new ObjectId(issueId),
  });

  if (!issue) {
    return null;
  }

  return {
    id: issue._id.toString(),
    title: issue.title,
    description: issue.description,
    descriptionHistory: issue.descriptionHistory ?? [],
    status: issue.status,
    priority: issue.priority,
    tenantId: issue.tenantId?.toString(),
    propertyId: issue.propertyId?.toString(),
    createdAtLabel: issue.createdAt
      ? formatDate(new Date(issue.createdAt))
      : "",
  };
}
