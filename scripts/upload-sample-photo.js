const fs = require('fs');
const path = require('path');
const { BlobServiceClient } = require('@azure/storage-blob');

// Load .env.local if present
const dotenvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(dotenvPath)) {
  const raw = fs.readFileSync(dotenvPath, 'utf8');
  raw.split(/\r?\n/).forEach((l) => {
    const m = l.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const k = m[1].trim();
      let v = m[2];
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      process.env[k] = v;
    }
  });
}

async function run() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const container = process.env.AZURE_STORAGE_CONTAINER || 'rentsimple2';
  if (!conn) {
    console.error('AZURE_STORAGE_CONNECTION_STRING missing');
    process.exit(1);
  }

  const client = BlobServiceClient.fromConnectionString(conn);
  const containerClient = client.getContainerClient(container);
  await containerClient.createIfNotExists();

  const name = `test-${Date.now()}.txt`;
  const block = containerClient.getBlockBlobClient(name);
  const content = 'This is a QA test blob';
  await block.uploadData(Buffer.from(content), { blobHTTPHeaders: { blobContentType: 'text/plain' } });

  console.log('Uploaded sample blob:', block.url);
  console.log('blobName:', name);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});