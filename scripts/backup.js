import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/restaurant360';
const BACKUP_DIR = path.join(process.cwd(), 'backups');

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetDir = path.join(BACKUP_DIR, `backup-${timestamp}`);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`📦 Starting automated MongoDB backup to: ${targetDir}`);

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  let totalDocs = 0;

  for (const col of collections) {
    const colName = col.name;
    const docs = await db.collection(colName).find({}).toArray();
    const filePath = path.join(targetDir, `${colName}.json`);

    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
    console.log(`  ✓ Exported ${colName}: ${docs.length} documents`);
    totalDocs += docs.length;
  }

  console.log(`\n🎉 Backup complete! ${collections.length} collections (${totalDocs} documents) saved successfully.`);
  await mongoose.disconnect();
}

backupDatabase().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
