import initSqlJs, { Database, QueryExecResult } from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

let sqlPromise: Promise<any> | null = null

export async function getSqlInstance() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: () => sqlWasmUrl
    })
  }
  return sqlPromise
}

export interface ColumnInfo {
  cid: number
  name: string
  type: string
  notnull: number
  dflt_value: any
  pk: number
}

export interface TableInfo {
  name: string
  rowCount: number
  columns: ColumnInfo[]
}

export interface QueryResult {
  columns: string[]
  values: any[][]
  executionTimeMs: number
  rowCount: number
  error?: string
}

/**
 * Open SQLite database from ArrayBuffer (.sqlite, .db)
 */
export async function openDatabaseFromBuffer(buffer: ArrayBuffer | Uint8Array): Promise<Database> {
  const SQL = await getSqlInstance()
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  return new SQL.Database(u8)
}

/**
 * Open SQLite database from raw SQL text (.sql dump)
 */
export async function loadDatabaseFromSql(sqlText: string): Promise<Database> {
  const SQL = await getSqlInstance()
  const db = new SQL.Database()
  db.run(sqlText)
  return db
}

/**
 * Get all user tables and metadata from SQLite database
 */
export function getDatabaseTables(db: Database): TableInfo[] {
  try {
    const tableQuery = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
    )

    if (!tableQuery || tableQuery.length === 0 || !tableQuery[0].values) {
      return []
    }

    const tableNames = tableQuery[0].values.map((v) => String(v[0]))
    const result: TableInfo[] = []

    for (const name of tableNames) {
      // Escape table name for pragma/count
      const escaped = name.replace(/"/g, '""')

      // Get columns info
      let columns: ColumnInfo[] = []
      try {
        const colRes = db.exec(`PRAGMA table_info("${escaped}");`)
        if (colRes && colRes[0] && colRes[0].values) {
          columns = colRes[0].values.map((row) => ({
            cid: Number(row[0]),
            name: String(row[1]),
            type: String(row[2] || 'TEXT'),
            notnull: Number(row[3]),
            dflt_value: row[4],
            pk: Number(row[5])
          }))
        }
      } catch {}

      // Get row count
      let rowCount = 0
      try {
        const countRes = db.exec(`SELECT count(*) FROM "${escaped}";`)
        if (countRes && countRes[0] && countRes[0].values && countRes[0].values[0]) {
          rowCount = Number(countRes[0].values[0][0])
        }
      } catch {}

      result.push({
        name,
        rowCount,
        columns
      })
    }

    return result
  } catch (err) {
    console.error('Failed to get database tables:', err)
    return []
  }
}

/**
 * Safely execute user query with performance telemetry
 */
export function executeUserQuery(db: Database, sql: string): QueryResult {
  const start = performance.now()
  try {
    const res = db.exec(sql)
    const executionTimeMs = Math.round((performance.now() - start) * 100) / 100

    if (!res || res.length === 0) {
      return {
        columns: [],
        values: [],
        executionTimeMs,
        rowCount: 0
      }
    }

    const first = res[0]
    return {
      columns: first.columns || [],
      values: first.values || [],
      executionTimeMs,
      rowCount: first.values ? first.values.length : 0
    }
  } catch (err: any) {
    const executionTimeMs = Math.round((performance.now() - start) * 100) / 100
    return {
      columns: [],
      values: [],
      executionTimeMs,
      rowCount: 0,
      error: err.message || 'SQL Execution Error'
    }
  }
}

/**
 * Create a rich sample SQLite database in memory for demonstration
 */
export async function createSampleDatabase(): Promise<Database> {
  const sampleSql = `
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'developer',
      balance REAL DEFAULT 0.0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    INSERT INTO users (name, email, role, balance, is_active, created_at) VALUES
      ('Alex Vance', 'alex.vance@blackmesa.corp', 'admin', 14500.50, 1, '2026-01-15 09:30:00'),
      ('Gordon Freeman', 'g.freeman@blackmesa.corp', 'researcher', 32000.00, 1, '2026-01-20 14:15:22'),
      ('Sarah Connor', 's.connor@resistance.net', 'security', 8750.25, 1, '2026-02-04 11:45:00'),
      ('Neo Anderson', 'thomas.anderson@metacortex.io', 'lead_architect', 24800.00, 1, '2026-02-18 16:20:10'),
      ('Trinity Moss', 'trinity@nebuchadnezzar.ship', 'operator', 19500.75, 1, '2026-03-01 08:05:43'),
      ('Marcus Wright', 'marcus@cyberdyne.org', 'guest', 1200.00, 0, '2026-03-12 19:50:00'),
      ('Elena Rostova', 'elena.rostova@nexus.ai', 'senior_dev', 18900.00, 1, '2026-04-05 10:12:30'),
      ('Kaelen Frost', 'kaelen@sentinel.ops', 'engineer', 15400.30, 1, '2026-04-22 13:40:15');

    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      rating REAL DEFAULT 4.5
    );

    INSERT INTO products (sku, title, category, price, stock, rating) VALUES
      ('NX-KEY-001', 'ZenDev Lifetime Enterprise License', 'Software', 199.00, 999, 4.9),
      ('HW-HSM-202', 'Titanium YubiKey Security Token 5Ci', 'Hardware', 75.50, 142, 4.8),
      ('NET-TAP-10', 'Gigabit Hardware Ethernet Tap v3', 'Network', 129.99, 48, 4.7),
      ('SW-SHRED-9', 'Cyber Fortress 7-Pass Shredder Addon', 'Software', 49.00, 500, 4.6),
      ('DEV-POD-01', 'ARM64 Offline Micro Development Rig', 'Hardware', 349.00, 18, 4.9);

    CREATE TABLE audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      actor TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      status TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    INSERT INTO audit_logs (event_type, actor, ip_address, status, timestamp) VALUES
      ('AUTH_SUCCESS', 'alex.vance@blackmesa.corp', '192.168.1.105', 'SUCCESS', '2026-09-10 03:15:00'),
      ('VAULT_ACCESS', 'g.freeman@blackmesa.corp', '10.0.0.12', 'SUCCESS', '2026-09-10 04:22:11'),
      ('PORT_KILL', 'thomas.anderson@metacortex.io', '127.0.0.1', 'SUCCESS', '2026-09-10 05:00:34'),
      ('LICENSE_SYNC', 'SYSTEM', '127.0.0.1', 'SUCCESS', '2026-09-10 05:15:18'),
      ('FAILED_DECRYPT', 'unknown_probe', '45.33.32.156', 'BLOCKED', '2026-09-10 05:22:40');
  `
  return loadDatabaseFromSql(sampleSql)
}
