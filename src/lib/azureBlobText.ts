import { BlobServiceClient } from "@azure/storage-blob";

function getAzureContainerClient() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || process.env.AZURE_STORAGE_CONTAINER;
  if (!conn || !containerName) return null;

  const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
  return blobServiceClient.getContainerClient(containerName);
}

function toSafeFileSegment(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "template";
  return trimmed
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

async function streamToString(stream: NodeJS.ReadableStream | null | undefined): Promise<string> {
  if (!stream) return "";

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function uploadTextTemplateToBlob(input: {
  kindPath: string;
  originalFilename?: string;
  text: string;
}): Promise<{ blobName: string }>
{
  const containerClient = getAzureContainerClient();
  if (!containerClient) {
    throw new Error(
      "Azure Blob Storage is not configured. Set AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_CONTAINER (or AZURE_STORAGE_CONTAINER_NAME)."
    );
  }

  const safe = toSafeFileSegment(input.originalFilename ?? "template.txt");
  const blobName = `${input.kindPath}/${crypto.randomUUID()}-${safe}`;

  await containerClient.createIfNotExists();

  const blockBlob = containerClient.getBlockBlobClient(blobName);
  await blockBlob.uploadData(Buffer.from(input.text, "utf8"), {
    blobHTTPHeaders: {
      blobContentType: "text/plain; charset=utf-8",
    },
  });

  return { blobName };
}

export async function downloadTextFromBlob(blobName: string): Promise<string> {
  const containerClient = getAzureContainerClient();
  if (!containerClient) {
    throw new Error(
      "Azure Blob Storage is not configured. Set AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_CONTAINER (or AZURE_STORAGE_CONTAINER_NAME)."
    );
  }

  const blobClient = containerClient.getBlobClient(blobName);
  const res = await blobClient.download();
  return streamToString(res.readableStreamBody as any);
}

export async function deleteBlobIfExists(blobName: string): Promise<void> {
  const containerClient = getAzureContainerClient();
  if (!containerClient) return;

  const blockBlob = containerClient.getBlockBlobClient(blobName);
  await blockBlob.deleteIfExists();
}
