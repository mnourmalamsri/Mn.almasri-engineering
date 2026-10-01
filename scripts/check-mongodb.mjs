import { loadEnvFile } from 'node:process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkMongo, closeMongo } from '../src/db.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try { loadEnvFile(resolve(root, '.dev.vars')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }

try {
  const result = await checkMongo(process.env);
  console.log(`MongoDB OK - database: ${result.dbName}`);
  process.exitCode = 0;
} catch (error) {
  if (error.code === 'DATABASE_NOT_CONFIGURED') console.error('MongoDB is not configured. Put MONGODB_URI in .dev.vars.');
  else if (error.code === 'DATABASE_URI_INVALID') console.error('MONGODB_URI is not a valid mongodb:// or mongodb+srv:// URI.');
  else if (error.name === 'MongoServerSelectionError') console.error('Cannot reach MongoDB. Check Internet, Atlas Network Access, DNS, and the cluster hostname.');
  else if (error.name === 'MongoNetworkError') console.error('MongoDB network error. Check Internet/firewall and try again.');
  else if (error.name === 'MongoWaitQueueTimeoutError') console.error('MongoDB pool waited too long. This build creates indexes sequentially; retry once after the Atlas cluster is fully ready.');
  else if (error.code === 8000 || error.codeName === 'AtlasError' || error.codeName === 'AuthenticationFailed') console.error('MongoDB authentication failed. Check database username/password.');
  else console.error(`MongoDB check failed: ${error.name || 'Error'} (${error.code ?? error.codeName ?? 'UNKNOWN'}): ${error.message || ''}`);
  process.exitCode = 1;
} finally {
  await closeMongo().catch(() => {});
}
