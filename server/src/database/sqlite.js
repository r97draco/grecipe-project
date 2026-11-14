const { DatabaseSync } = require('node:sqlite');
const { mkdirSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const { randomBytes } = require('node:crypto');

const filename = process.env.SQLITE_PATH || resolve(__dirname, '../../data/grecipe.sqlite');
if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
const db = new DatabaseSync(filename);
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS families (_id TEXT PRIMARY KEY, name TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS users (
    _id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, userName TEXT,
    photoURL TEXT, family TEXT REFERENCES families(_id) ON DELETE SET NULL,
    isFamilyHead INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS items (
    _id TEXT PRIMARY KEY, familyId TEXT NOT NULL REFERENCES families(_id) ON DELETE CASCADE,
    name TEXT NOT NULL, quantity REAL, expiresAt TEXT, fooDBKey TEXT
  );
  CREATE INDEX IF NOT EXISTS users_family ON users(family);
  CREATE INDEX IF NOT EXISTS items_family ON items(familyId);
`);
// Add date provenance to existing local databases without changing saved dates.
const itemColumns = db.prepare('PRAGMA table_info(items)').all();
if (!itemColumns.some(column => column.name === 'expirySource')) db.exec('ALTER TABLE items ADD COLUMN expirySource TEXT');
const columns = {
  users: ['email', 'userName', 'photoURL', 'family', 'isFamilyHead'],
  families: ['name'],
  items: ['familyId', 'name', 'quantity', 'expiresAt', 'fooDBKey', 'expirySource'],
};
const decode = row => row ? { ...row, ...(Object.hasOwn(row, 'isFamilyHead') ? { isFamilyHead: Boolean(row.isFamilyHead) } : {}) } : null;
function allowed(table) {
  if (!columns[table]) throw new Error('Unknown database table');
}
function all(table, field, value) {
  allowed(table);
  if (field && !['_id', ...columns[table]].includes(field)) throw new Error('Unknown column');
  return db.prepare(`SELECT * FROM ${table}${field ? ` WHERE ${field} = ?` : ''}`).all(...(field ? [value ?? null] : [])).map(decode);
}
function get(table, id) { return all(table, '_id', id)[0] || null; }
function normalize(value) { return typeof value === 'boolean' ? Number(value) : value instanceof Date ? value.toISOString() : value ?? null; }
function create(table, data) {
  allowed(table);
  const id = randomBytes(12).toString('hex');
  const fields = columns[table].filter(key => data[key] !== undefined);
  db.prepare(`INSERT INTO ${table} (_id, ${fields.join(', ')}) VALUES (${['_id', ...fields].map(() => '?').join(', ')})`).run(id, ...fields.map(key => normalize(data[key])));
  return get(table, id);
}
function update(table, id, data) {
  allowed(table);
  const fields = columns[table].filter(key => data[key] !== undefined);
  if (fields.length) db.prepare(`UPDATE ${table} SET ${fields.map(key => `${key} = ?`).join(', ')} WHERE _id = ?`).run(...fields.map(key => normalize(data[key])), id);
  return get(table, id);
}
function remove(table, id) {
  const old = get(table, id);
  db.prepare(`DELETE FROM ${table} WHERE _id = ?`).run(id);
  return old;
}
function transaction(work) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = work(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
module.exports = { db, all, get, create, update, remove, transaction, filename };
