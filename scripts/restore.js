import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/restaurant360';
const BACKUP_DIR = path.join(process.cwd(), 'backups');

async function restoreDatabase() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error('No backups directory found.');
    process.exit(1);
  }

  const dirs = fs.readdirSync(BACKUP_DIR).filter((f) => fs.statSync(path.join(BACKUP_DIR, f)).isDirectory());
  if (dirs.length === 0) {
    console.error('No backup folders found.');
    process.exit(1);
  }

  // Get most recent backup
  dirs.sort().reverse();
  const latestBackup = dirs[0];
  const sourceDir = path.join(BACKUP_DIR, latestBackup);

  console.log(`♻️ Restoring database from: ${latestBackup}`);

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const colName = file.replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf-8'));

    if (data.length > 0) {
      await db.collection(colName).deleteMany({});
      await db.collection(colName).insertMany(data);
      console.log(`  ✓ Restored ${colName}: ${data.length} documents`);
    }
  }

  console.log('\n🎉 Restoration complete! Database restored to latest backup state.');
  await mongoose.disconnect();
}

restoreDatabase().catch((err) => {
  console.error('Restore failed:', err);
  process.exit(1);
});
