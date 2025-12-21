// Delete a single blob by name
export async function deleteBlob(blobName: string) {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}

// Delete multiple blobs by name
export async function deleteBlobs(blobNames: string[]) {
  await Promise.all(blobNames.map(deleteBlob));
}
import { BlobServiceClient } from "@azure/storage-blob";

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_STORAGE_CONTAINER = process.env.AZURE_STORAGE_CONTAINER || "rentit_1766317052102";

if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING env var");
}

export const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
export const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER);
