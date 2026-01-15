import { downloadTextFromBlob } from "@/lib/azureBlobText";
import {
  getActiveLetterTemplateId,
  getLetterTemplateById,
  type LetterTemplateChannel,
  type LetterTemplateKind,
} from "@/lib/letterTemplates";

export async function getActiveLetterTemplateText(input: {
  kind: LetterTemplateKind;
  channel: LetterTemplateChannel;
}): Promise<string | null> {
  const templateId = await getActiveLetterTemplateId({ kind: input.kind, channel: input.channel }).catch(() => null);
  if (!templateId) return null;

  const template = await getLetterTemplateById(templateId).catch(() => null);
  if (!template) return null;

  // Safety: ensure it matches what we asked for
  if (template.kind !== input.kind) return null;
  if (template.channel !== input.channel) return null;

  const text = await downloadTextFromBlob(template.blobName).catch(() => null);
  const trimmed = typeof text === "string" ? text.trim() : "";
  return trimmed ? text : null;
}
