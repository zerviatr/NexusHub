/**
 * server/src/db.ts
 *
 * LibSQL (Turso-compatible) database layer.
 * - Local dev:  TURSO_URL=file:./zendev.db  (no auth)
 * - Production: TURSO_URL=libsql://...  TURSO_AUTH_TOKEN=...
 *
 * Tables:
 *   licenses    — one row per license key
 *   activations — one row per (key, device) pair
 */
import {
  createClient,
  type Client,
  type Transaction,
  type TransactionMode,
  type InStatement,
  type InArgs,
  type ResultSet
} from '@libsql/client'

let _db: Client | null = null

export function getDb(): Client {
  if (!_db) {
    _db = createClient({
      url:       process.env['TURSO_URL']        ?? 'file:./zendev.db',
      authToken: process.env['TURSO_AUTH_TOKEN'] ?? undefined,
    })
  }
  return _db
}

/**
 * Enforces foreign key constraint checks on the LibSQL/SQLite connection.
 * SQLite/LibSQL disables foreign key enforcement by default for historical compatibility.
 */
export async function enableForeignKeys(client?: Client): Promise<void> {
  const db = client ?? getDb()
  await db.execute('PRAGMA foreign_keys = ON;')
}

/**
 * Transaction helper for multi-statement atomic operations.
 * Executes the provided callback within an interactive transaction.
 * Automatically commits on successful completion, and rolls back if an exception occurs.
 *
 * @param fn Callback that receives the active LibSQL Transaction instance
 * @param mode Transaction mode: 'write' | 'read' | 'deferred' (default: 'write')
 * @returns The resolved value of the callback
 */
export async function withTransaction<T>(
  fn: (tx: Transaction) => Promise<T>,
  mode: TransactionMode = 'write'
): Promise<T> {
  const db = getDb()
  const tx = await db.transaction(mode)
  try {
    const result = await fn(tx)
    await tx.commit()
    return result
  } catch (error) {
    try {
      if (!tx.closed) {
        await tx.rollback()
      }
    } catch (rollbackErr) {
      // Transaction may have already been aborted or rolled back by database
    }
    throw error
  } finally {
    if (!tx.closed) {
      tx.close()
    }
  }
}

/** Run once on startup — creates tables if they don't exist. */
export async function migrate(): Promise<void> {
  const db = getDb()

  // 1. Enforce foreign key constraints across relational tables
  await enableForeignKeys(db)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS licenses (
      key              TEXT    PRIMARY KEY,
      tier             TEXT    NOT NULL,
      expires_at       INTEGER NOT NULL DEFAULT 0,
      order_id         TEXT,
      email            TEXT,
      max_activations  INTEGER NOT NULL DEFAULT 2,
      is_revoked       INTEGER NOT NULL DEFAULT 0,
      created_at       INTEGER NOT NULL
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS activations (
      id           INTEGER PRIMARY KEY,
      license_key  TEXT    NOT NULL REFERENCES licenses(key),
      device_id    TEXT    NOT NULL,
      activated_at INTEGER NOT NULL,
      last_seen    INTEGER NOT NULL,
      UNIQUE(license_key, device_id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      action     TEXT NOT NULL,
      details    TEXT NOT NULL,
      ip         TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS coupons (
      code         TEXT PRIMARY KEY,
      days_to_add  INTEGER NOT NULL,
      is_used      INTEGER NOT NULL DEFAULT 0,
      used_by_key  TEXT,
      note         TEXT,
      created_at   INTEGER NOT NULL,
      used_at      INTEGER
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id         INTEGER PRIMARY KEY,
      email      TEXT    NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )
  `)

  // Safe migrations for commercial metadata and anti-piracy controls in existing DBs
  try {
    await db.execute(`ALTER TABLE licenses ADD COLUMN sales_channel TEXT`)
  } catch {}
  try {
    await db.execute(`ALTER TABLE licenses ADD COLUMN customer_note TEXT`)
  } catch {}
  try {
    await db.execute(`ALTER TABLE licenses ADD COLUMN customer_name TEXT`)
  } catch {}
  try {
    await db.execute(`ALTER TABLE licenses ADD COLUMN customer_country TEXT`)
  } catch {}
  try {
    await db.execute(`ALTER TABLE licenses ADD COLUMN last_hwid_reset INTEGER DEFAULT 0`)
  } catch {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS webhook_dlq (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name    TEXT,
      payload       TEXT NOT NULL,
      error_message TEXT NOT NULL,
      retry_count   INTEGER NOT NULL DEFAULT 0,
      status        TEXT NOT NULL DEFAULT 'failed',
      created_at    INTEGER NOT NULL,
      last_retry_at INTEGER
    )
  `)

  // High-performance secondary indexes for O(log N) lookups & anti-piracy queries
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_activations_license_key ON activations(license_key)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_activations_device_id ON activations(device_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_licenses_created_at ON licenses(created_at)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_licenses_revoked ON licenses(is_revoked)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_webhook_dlq_status ON webhook_dlq(status)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_webhook_dlq_created_at ON webhook_dlq(created_at)`)

  console.log('[db] Migration and index optimization complete')
}
