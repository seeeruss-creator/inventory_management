import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

const DB_NAME = process.env.DB_NAME || 'batchoy_inventory';
const baseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
};

export const pool = mysql.createPool({
  ...baseConfig,
  database: DB_NAME
});

export const initDatabase = async () => {
  const bootstrapPool = mysql.createPool(baseConfig);
  try {
    await bootstrapPool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const rawSchema = await readFile(schemaPath, 'utf8');
    const prepped = rawSchema
      .replace(/CREATE DATABASE IF NOT EXISTS\s+`[^`]+`\s*;/i, '')
      .replace(/USE\s+`[^`]+`\s*;/i, `USE \`${DB_NAME}\`;`)
      .replace(/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/gi, 'ADD COLUMN');

    // Split schema into DDL and seed inserts so we can control seeding
    const splitMarker = /--\s*Seed default items/i;
    const [ddlPart, seedPartWithMarker] = prepped.split(splitMarker);
    const ddl = ddlPart || prepped;
    const seed = seedPartWithMarker ? `-- Seed default items\n${seedPartWithMarker}` : '';

    const runStatements = async (sql) => {
      const statements = sql
        .split(';')
        .map((stmt) => stmt.trim())
        .filter(Boolean);

      for (const stmt of statements) {
        try {
          await bootstrapPool.query(stmt);
        } catch (error) {
          const code = error?.code;
          if (code === 'ER_DUP_FIELDNAME' || code === 'ER_DUP_KEYNAME') {
            continue;
          }
          throw error;
        }
      }
    };

    // Always apply DDL
    await runStatements(ddl);

    // Only seed when explicitly enabled
    if (process.env.SEED_DEFAULTS === 'true' && seed) {
      await runStatements(seed);
    }
  } finally {
    await bootstrapPool.end();
  }
};

export const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('Connected to Railway');
  } catch (error) {
    console.error('Railway connection error:', error?.message || error);
  }
};
