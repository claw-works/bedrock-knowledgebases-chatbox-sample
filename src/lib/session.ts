import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface Session {
  sessionId: string;
  userId?: string;
  bedrockSessionId?: string;
  messages: Array<{ role: "user" | "assistant"; content: string; ts: number }>;
  createdAt: number;
  ttl: number;
}

export async function ensureTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id         TEXT PRIMARY KEY,
      user_id            TEXT,
      bedrock_session_id TEXT,
      messages           JSONB NOT NULL DEFAULT '[]',
      created_at         BIGINT NOT NULL,
      updated_at         BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
    )
  `);
  // Add user_id column if upgrading from old schema
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
  `);
  // Index for listing by user
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id, created_at DESC)
  `);
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const { rows } = await pool.query(
    `SELECT session_id, user_id, bedrock_session_id, messages, created_at FROM sessions WHERE session_id = $1`,
    [sessionId]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    sessionId: r.session_id,
    userId: r.user_id ?? undefined,
    bedrockSessionId: r.bedrock_session_id ?? undefined,
    messages: r.messages,
    createdAt: Number(r.created_at),
    ttl: 0,
  };
}

export async function saveSession(session: Session): Promise<void> {
  await pool.query(
    `INSERT INTO sessions (session_id, user_id, bedrock_session_id, messages, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (session_id) DO UPDATE SET
       bedrock_session_id = EXCLUDED.bedrock_session_id,
       messages = EXCLUDED.messages,
       updated_at = EXCLUDED.updated_at`,
    [
      session.sessionId,
      session.userId ?? null,
      session.bedrockSessionId ?? null,
      JSON.stringify(session.messages),
      session.createdAt,
      Date.now(),
    ]
  );
}

export async function deleteSession(sessionId: string): Promise<void> {
  await pool.query(`DELETE FROM sessions WHERE session_id = $1`, [sessionId]);
}

export async function listSessions(userId?: string, limit = 20): Promise<
  Array<{ sessionId: string; createdAt: number; preview: string }>
> {
  const { rows } = userId
    ? await pool.query(
        `SELECT session_id, created_at, messages FROM sessions
         WHERE user_id = $1 AND jsonb_array_length(messages) > 0
         ORDER BY created_at DESC LIMIT $2`,
        [userId, limit]
      )
    : await pool.query(
        `SELECT session_id, created_at, messages FROM sessions
         WHERE jsonb_array_length(messages) > 0
         ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
  return rows.map((r) => {
    const msgs = r.messages as Array<{ role: string; content: string }>;
    const first = msgs.find((m) => m.role === "user");
    return {
      sessionId: r.session_id,
      createdAt: Number(r.created_at),
      preview: first?.content.slice(0, 60) ?? "",
    };
  });
}
