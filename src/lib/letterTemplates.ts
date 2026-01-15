import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";

// Template kinds are admin-defined identifiers (e.g. TENANCY_PROCEED_LETTER, BACKGROUND_CHECKS_REQUEST, etc.)
// Keep them stable because they’re used as keys for "active template" settings.
export type LetterTemplateKind = string;

export type LetterTemplateChannel = "email" | "sms";

export type LetterTemplateDoc = {
  _id: ObjectId;
  kind: LetterTemplateKind;
  // Back-compat: older docs may not have channel (treated as "email")
  channel?: LetterTemplateChannel;
  name: string;
  blobName: string;
  contentType: string;
  createdAt: string;
  createdBy: string;
};

export type LetterTemplateDto = {
  id: string;
  kind: LetterTemplateKind;
  channel: LetterTemplateChannel;
  name: string;
  blobName: string;
  contentType: string;
  createdAt: string;
  createdBy: string;
};

function activeTemplateSettingId(kind: LetterTemplateKind, channel: LetterTemplateChannel) {
  return `LETTER_TEMPLATE_ACTIVE::${kind}::${channel}`;
}

type ActiveTemplateSettingDoc = {
  _id: string;
  templateId: string | null;
  updatedAt: string;
  updatedBy: string;
};

export function toLetterTemplateDto(doc: LetterTemplateDoc): LetterTemplateDto {
  const channel: LetterTemplateChannel = doc.channel ?? "email";
  return {
    id: doc._id.toString(),
    kind: doc.kind,
    channel,
    name: doc.name,
    blobName: doc.blobName,
    contentType: doc.contentType,
    createdAt: doc.createdAt,
    createdBy: doc.createdBy,
  };
}

export async function listLetterTemplates(input: {
  kind: LetterTemplateKind;
  channel: LetterTemplateChannel;
}): Promise<LetterTemplateDto[]> {
  const templates = await getCollection<LetterTemplateDoc>("letter_templates");
  const filter: Record<string, any> = {
    kind: input.kind,
  };

  // Back-compat: for email channel we also include docs missing channel.
  if (input.channel === "email") {
    filter.$or = [{ channel: "email" }, { channel: { $exists: false } }];
  } else {
    filter.channel = "sms";
  }

  const docs = await templates.find(filter).sort({ createdAt: -1 }).toArray();
  return docs.map(toLetterTemplateDto);
}

export async function listLetterTemplateKinds(): Promise<string[]> {
  const templates = await getCollection<LetterTemplateDoc>("letter_templates");
  const kinds = await templates.distinct("kind");
  return (Array.isArray(kinds) ? kinds : []).filter((k): k is string => typeof k === "string" && k.trim().length > 0).sort();
}

export async function createLetterTemplate(input: {
  kind: LetterTemplateKind;
  channel: LetterTemplateChannel;
  name: string;
  blobName: string;
  contentType: string;
  actorUserId: string;
}): Promise<LetterTemplateDto> {
  const templates = await getCollection<LetterTemplateDoc>("letter_templates");
  const now = new Date().toISOString();

  const doc: Omit<LetterTemplateDoc, "_id"> = {
    kind: input.kind,
    channel: input.channel,
    name: input.name,
    blobName: input.blobName,
    contentType: input.contentType,
    createdAt: now,
    createdBy: input.actorUserId,
  };

  const res = await templates.insertOne(doc as any);

  return toLetterTemplateDto({ ...(doc as any), _id: res.insertedId });
}

export async function deleteLetterTemplateById(templateId: string): Promise<LetterTemplateDto | null> {
  if (!ObjectId.isValid(templateId)) return null;
  const templates = await getCollection<LetterTemplateDoc>("letter_templates");
  const existing = await templates.findOne({ _id: new ObjectId(templateId) });
  if (!existing) return null;

  await templates.deleteOne({ _id: existing._id });
  return toLetterTemplateDto(existing);
}

export async function getActiveLetterTemplateId(input: {
  kind: LetterTemplateKind;
  channel: LetterTemplateChannel;
}): Promise<string | null> {
  const settings = await getCollection<ActiveTemplateSettingDoc>("app_settings");
  const doc = await settings.findOne({ _id: activeTemplateSettingId(input.kind, input.channel) });
  const templateId = typeof doc?.templateId === "string" ? doc.templateId : null;
  return templateId && ObjectId.isValid(templateId) ? templateId : null;
}

export async function setActiveLetterTemplateId(input: {
  kind: LetterTemplateKind;
  channel: LetterTemplateChannel;
  templateId: string | null;
  actorUserId: string;
}): Promise<{ templateId: string | null }> {
  const settings = await getCollection<ActiveTemplateSettingDoc>("app_settings");
  const now = new Date().toISOString();

  const templateId = input.templateId && ObjectId.isValid(input.templateId) ? input.templateId : null;

  await settings.updateOne(
    { _id: activeTemplateSettingId(input.kind, input.channel) },
    {
      $set: {
        templateId,
        updatedAt: now,
        updatedBy: input.actorUserId,
      },
      $setOnInsert: { _id: activeTemplateSettingId(input.kind, input.channel) },
    },
    { upsert: true }
  );

  return { templateId };
}

export async function getLetterTemplateById(templateId: string): Promise<LetterTemplateDto | null> {
  if (!ObjectId.isValid(templateId)) return null;
  const templates = await getCollection<LetterTemplateDoc>("letter_templates");
  const doc = await templates.findOne({ _id: new ObjectId(templateId) });
  return doc ? toLetterTemplateDto(doc) : null;
}
