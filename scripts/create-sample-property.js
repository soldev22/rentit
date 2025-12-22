const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

// Load .env.local
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
  const qaPath = path.resolve(__dirname, 'test-qa.json');
  if (!fs.existsSync(qaPath)) {
    console.error('Missing scripts/test-qa.json; run create-test-landlord.js first');
    process.exit(1);
  }

  const qa = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  const properties = db.collection('properties');

  const doc = {
    landlordId: new ObjectId(qa.id),
    title: 'QA Sample Property',
    headline: 'Lovely test property',
    description: 'Created by QA script',
    address: { line1: '1 QA Road', city: 'Testville', postcode: 'T3 0ST' },
    rentPcm: 900,
    photos: [],
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const res = await properties.insertOne(doc);
  console.log('Inserted property id:', res.insertedId.toString());

  await client.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});