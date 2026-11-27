import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://ilook_user:iLookSecureProductionDbPass2026!@ilook-postgres.ilook-system.svc.cluster.local:5432/ilook_db";

export const pool = new Pool({
  connectionString: connectionString.replace("postgresql+psycopg2://", "postgresql://"),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

let tablesInitialized = false;

export async function ensureTables() {
  if (tablesInitialized) return;
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          hashed_password VARCHAR(255) NOT NULL,
          full_name VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS edge_nodes (
          id VARCHAR(36) PRIMARY KEY,
          owner_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
          node_name VARCHAR(100) NOT NULL,
          node_token VARCHAR(64) UNIQUE NOT NULL,
          ip_address VARCHAR(64),
          version VARCHAR(32),
          is_online BOOLEAN DEFAULT FALSE,
          last_heartbeat TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS cameras (
          id VARCHAR(36) PRIMARY KEY,
          owner_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
          edge_node_id VARCHAR(36) REFERENCES edge_nodes(id) ON DELETE SET NULL,
          cam_uid VARCHAR(64) UNIQUE NOT NULL,
          cam_secret VARCHAR(64) NOT NULL,
          name VARCHAR(100) NOT NULL,
          onvif_ip VARCHAR(64),
          onvif_port INT DEFAULT 80,
          rtsp_source_url VARCHAR(512),
          is_online BOOLEAN DEFAULT FALSE,
          last_seen TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS pairing_codes (
          code VARCHAR(6) PRIMARY KEY,
          user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
          node_name VARCHAR(100) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          is_claimed BOOLEAN DEFAULT FALSE,
          claimed_node_id VARCHAR(36),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      tablesInitialized = true;
      console.log("[DB] PostgreSQL tables verified and ready.");
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn("[DB] Initialization check (will retry on next request):", err);
  }
}
