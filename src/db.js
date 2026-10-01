import { MongoClient } from 'mongodb';

const DEFAULT_DB = 'almasri_engineering';
const DEFAULT_OPTIONS = Object.freeze({
  appName: 'AlmasriEngineeringLocal',
  maxPoolSize: 5,
  minPoolSize: 0,
  maxConnecting: 3,
  maxIdleTimeMS: 30_000,
  serverSelectionTimeoutMS: 20_000,
  connectTimeoutMS: 20_000,
  socketTimeoutMS: 45_000,
  // Do not fail merely because the Atlas free tier is slow to hand out a pooled socket.
  // Server selection/connect timeouts above still protect against unreachable servers.
  waitQueueTimeoutMS: 0,
  retryReads: true,
  retryWrites: true
});

let cachedKey = '';
let cachedClient = null;
let cachedDb = null;
let connecting = null;
let indexesPromise = null;

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function mongoConfig(env = {}) {
  const uri = text(env.MONGODB_URI);
  const dbName = text(env.MONGODB_DB) || DEFAULT_DB;
  if (!uri) {
    const error = new Error('DATABASE_NOT_CONFIGURED');
    error.code = 'DATABASE_NOT_CONFIGURED';
    throw error;
  }
  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    const error = new Error('DATABASE_URI_INVALID');
    error.code = 'DATABASE_URI_INVALID';
    throw error;
  }
  if (!/^[A-Za-z0-9_.-]{1,63}$/.test(dbName)) {
    const error = new Error('DATABASE_NAME_INVALID');
    error.code = 'DATABASE_NAME_INVALID';
    throw error;
  }
  return { uri, dbName };
}

function optionsFromEnv(env = {}) {
  const options = { ...DEFAULT_OPTIONS };
  const timeout = Number(env.MONGODB_TIMEOUT_MS);
  if (Number.isFinite(timeout) && timeout >= 5_000 && timeout <= 60_000) {
    options.serverSelectionTimeoutMS = timeout;
    options.connectTimeoutMS = timeout;
  }
  return options;
}

async function createConnection(env = {}) {
  const { uri, dbName } = mongoConfig(env);
  const key = `${uri}\n${dbName}`;

  if (cachedClient && cachedDb && cachedKey === key) {
    try {
      await cachedDb.command({ ping: 1 });
      return { client: cachedClient, db: cachedDb };
    } catch {
      try { await cachedClient.close(); } catch {}
      cachedClient = null;
      cachedDb = null;
      cachedKey = '';
      indexesPromise = null;
    }
  }

  const client = new MongoClient(uri, optionsFromEnv(env));
  try {
    await client.connect();
    const db = client.db(dbName);
    await db.command({ ping: 1 });
    cachedClient = client;
    cachedDb = db;
    cachedKey = key;
    indexesPromise = null;
    return { client, db };
  } catch (error) {
    try { await client.close(); } catch {}
    throw error;
  }
}

// Reuse one connection pool while the local Node.js process is running.
// The returned close() is intentionally a no-op so each API request does not
// destroy the pool. closeMongo() is used when the local server exits.
export async function connect(env = {}) {
  const { uri, dbName } = mongoConfig(env);
  const key = `${uri}\n${dbName}`;
  if (cachedClient && cachedDb && cachedKey === key) {
    return { db: cachedDb, close: async () => {} };
  }
  if (!connecting) {
    connecting = createConnection(env).finally(() => { connecting = null; });
  }
  const { db } = await connecting;
  return { db, close: async () => {} };
}

export async function indexes(db) {
  if (db === cachedDb && indexesPromise) return indexesPromise;

  // Create indexes one-by-one. Atlas free/shared clusters can be slow while waking
  // up, and firing many createIndex commands at once can exhaust the driver's
  // wait queue even though the database connection itself is healthy.
  const definitions = [
    ['reports', { number: 1 }, { unique: true, name: 'ux_reports_number' }],
    ['reports', { projectId: 1, date: -1 }, { name: 'ix_reports_project_date' }],
    ['contracts', { number: 1 }, { unique: true, name: 'ux_contracts_number' }],
    ['contracts', { projectId: 1, contractDate: -1 }, { name: 'ix_contracts_project_date' }],
    ['activity', { at: -1 }, { name: 'ix_activity_at' }],
    ['users', { employeeNo: 1 }, { unique: true, name: 'ux_users_employee_no' }],
    ['users', { projectId: 1, deleted: 1 }, { name: 'ix_users_project_deleted' }],
    ['sessions', { expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_sessions' }],
    ['attempts', { expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_attempts' }],
    ['inspections', { assignedTo: 1, deleted: 1, date: -1 }, { name: 'ix_inspections_assignee' }],
    ['inspections', { projectId: 1, deleted: 1 }, { name: 'ix_inspections_project' }],
    ['photos', { parentType: 1, parentId: 1, deleted: 1 }, { name: 'ix_photos_parent' }]
  ];

  const task = (async () => {
    for (const [collection, keys, options] of definitions) {
      await db.collection(collection).createIndex(keys, options);
    }
    return db;
  })();

  if (db === cachedDb) {
    indexesPromise = task.catch(error => {
      indexesPromise = null;
      throw error;
    });
    return indexesPromise;
  }
  return task;
}

export async function checkMongo(env = {}) {
  const connection = await connect(env);
  await connection.db.command({ ping: 1 });
  await indexes(connection.db);
  return { ok: true, dbName: connection.db.databaseName };
}

export async function closeMongo() {
  const client = cachedClient;
  cachedClient = null;
  cachedDb = null;
  cachedKey = '';
  indexesPromise = null;
  connecting = null;
  if (client) await client.close();
}
