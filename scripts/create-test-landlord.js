const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

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
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing in environment');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  const password = 'Password123!';
  const hashed = await bcrypt.hash(password, 10);

  const email = `qa-landlord+${Date.now()}@example.com`;
  const user = {
    name: 'QA Landlord',
    email,
    tel: null,
    hashedPassword: hashed,
    role: 'LANDLORD',
    createdAt: new Date(),
  };

  const res = await db.collection('users').insertOne(user);
  const id = res.insertedId.toString();
  console.log('Inserted user id:', id);
  console.log('email:', email);
  console.log('password:', password);

  // write test info for subsequent scripts
  const out = { id, email, password };
  fs.writeFileSync(path.resolve(__dirname, 'test-qa.json'), JSON.stringify(out, null, 2));
  console.log('Wrote scripts/test-qa.json');

  await client.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});