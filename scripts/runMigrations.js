/* eslint-disable @typescript-eslint/no-var-requires */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const migrationsDir = path.join(__dirname, '..', 'src', 'db', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running migration: ${file}`);
    await client.query(sql);
  }
  await client.end();
  console.log('Migrations complete');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
