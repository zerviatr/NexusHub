/**
 * server/src/db.ts
 *
 * LibSQL (Turso-compatible) database layer.
 * - Local dev:  TURSO_URL=file:./nexushub.db  (no auth)
 * - Production: TURSO_URL=libsql://...  TURSO_AUTH_TOKEN=...
 *
 * Tables:
 *   licenses    — one row per license key
 *   activations — one row per (key, device) pair
 */
import { createClient, type Client } from '@libsql/client'

let _db: Client | null = null

export function getDb(): Client {
  if (!_db) {
    _db = createClient({
      url:       process.env['TURSO_URL']        ?? 'file:./nexushub.db',
      authToken: process.env['TURSO_AUTH_TOKEN'] ?? undefined,
    })
  }
  return _db
}

/** Run once on startup — creates tables if they don't exist. */
export async function migrate(): Promise<void> {
  const db = getDb()

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

  console.log('[db] Migration complete')
}
