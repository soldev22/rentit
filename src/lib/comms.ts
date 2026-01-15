import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";

export type CommsKind = "adhoc" | "legal" | "maintenance";

export type DeliveryChannel = "email" | "sms";

export type DeliveryStatus =
  | "queued"
  | "sent"
  | "failed"
  | "skipped_missing_destination"
  | "skipped_no_opt_in"
  | "skipped_disabled";

export type CommsParticipant = {
  userId: ObjectId;
  role?: string;
  email?: string;
  phone?: string;
};

export type CommsThread = {
  _id?: ObjectId;
  type: "direct";
  participantKey: string; // stable key for (sender, recipient)
  participants: CommsParticipant[];
  subject?: string;
  kind: CommsKind;
  createdAt: Date;
  lastMessageAt: Date;
};

export type CommsMessage = {
  _id?: ObjectId;
  threadId: ObjectId;
  senderUserId: ObjectId;
  senderRole?: string;
  subject?: string;
  body: string;
  kind: CommsKind;
  createdAt: Date;
};

export type CommsDelivery = {
  _id?: ObjectId;
  messageId: ObjectId;
  threadId: ObjectId;
  userId: ObjectId;
  channel: DeliveryChannel;
  to?: string;
  provider: "resend" | "twilio" | "simulated" | "not_configured";
  providerMessageId?: string;
  status: DeliveryStatus;
  error?: string;
  attemptedAt: Date;
  updatedAt?: Date;
};

function directParticipantKey(a: ObjectId, b: ObjectId): string {
  const aStr = a.toString();
  const bStr = b.toString();
  const [x, y] = aStr < bStr ? [aStr, bStr] : [bStr, aStr];
  return `direct:${x}:${y}`;
}

export async function getOrCreateDirectThread(params: {
  sender: CommsParticipant;
  recipient: CommsParticipant;
  kind: CommsKind;
  subject?: string;
}): Promise<CommsThread> {
  const threads = await getCollection("comms_threads");
  const key = directParticipantKey(params.sender.userId, params.recipient.userId);

  const existing = (await threads.findOne({ participantKey: key })) as unknown as CommsThread | null;
  if (existing) return existing;

  const now = new Date();
  const doc: CommsThread = {
    type: "direct",
    participantKey: key,
    participants: [params.sender, params.recipient],
    subject: params.subject,
    kind: params.kind,
    createdAt: now,
    lastMessageAt: now,
  };

  const result = await threads.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function addMessage(params: {
  threadId: ObjectId;
  senderUserId: ObjectId;
  senderRole?: string;
  subject?: string;
  body: string;
  kind: CommsKind;
}): Promise<CommsMessage> {
  const messages = await getCollection("comms_messages");
  const threads = await getCollection("comms_threads");

  const now = new Date();
  const doc: CommsMessage = {
    threadId: params.threadId,
    senderUserId: params.senderUserId,
    senderRole: params.senderRole,
    subject: params.subject,
    body: params.body,
    kind: params.kind,
    createdAt: now,
  };

  const result = await messages.insertOne(doc);
  await threads.updateOne(
    { _id: params.threadId },
    { $set: { lastMessageAt: now } }
  );

  return { ...doc, _id: result.insertedId };
}

export async function addDelivery(delivery: Omit<CommsDelivery, "_id">): Promise<ObjectId> {
  const deliveries = await getCollection("comms_deliveries");
  const result = await deliveries.insertOne(delivery);
  return result.insertedId;
}

export async function listThreadsForUser(userId: ObjectId): Promise<CommsThread[]> {
  const threads = await getCollection("comms_threads");
  const result = (await threads
    .find({ "participants.userId": userId })
    .sort({ lastMessageAt: -1, _id: -1 })
    .limit(200)
    .toArray()) as unknown as CommsThread[];

  return result;
}

export async function listMessagesForThread(params: {
  threadId: ObjectId;
  userId: ObjectId;
}): Promise<CommsMessage[]> {
  const threads = await getCollection("comms_threads");
  const messages = await getCollection("comms_messages");

  const thread = await threads.findOne({ _id: params.threadId, "participants.userId": params.userId });
  if (!thread) return [];

  const result = (await messages
    .find({ threadId: params.threadId })
    .sort({ createdAt: 1, _id: 1 })
    .limit(1000)
    .toArray()) as unknown as CommsMessage[];

  return result;
}

export function toCsvValue(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}
