import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLocalServer } from './local-server.mjs';
import { checkMongo, closeMongo } from '../src/db.js';

const port = Number(process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be between 1 and 65535');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required in the hosting environment.');
  process.exit(1);
}
process.env.MONGODB_DB ||= 'almasri_engineering';
if (!process.env.SETUP_TOKEN) {
  console.error('SETUP_TOKEN is required in the hosting environment.');
  process.exit(1);
}

try {
  const result = await checkMongo(process.env);
  console.log(`MongoDB connected: ${result.dbName}`);
} catch (error) {
  if (error.code === 'DATABASE_URI_INVALID') console.error('MONGODB_URI is invalid.');
  else if (error.name === 'MongoServerSelectionError') console.error('MongoDB cannot be reached. Check Atlas Network Access.');
  else if (error.code === 8000 || error.codeName === 'AtlasError') console.error('MongoDB authentication failed.');
  else console.error(`MongoDB startup failed: ${error.name || 'Error'} (${error.code ?? error.codeName ?? 'UNKNOWN'})`);
  await closeMongo().catch(() => {});
  process.exit(1);
}

const server = createLocalServer({ allowPublicHost: true });
server.on('error', error => {
  console.error(`Server could not start: ${error.code || error.name}`);
  process.exitCode = 1;
});
server.listen(port, '0.0.0.0', () => {
  console.log(`Almasri Engineering cloud server listening on port ${port}`);
});

let closing = false;
const shutdown = async () => {
  if (closing) return;
  closing = true;
  await new Promise(resolveClose => server.close(resolveClose));
  await closeMongo().catch(() => {});
  process.exit(0);
};
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, shutdown);
