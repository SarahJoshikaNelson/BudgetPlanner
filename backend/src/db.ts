import Database from "better-sqlite3";
import path from "path";

const DB_PATH =
  process.env.DB_PATH || path.join(process.cwd(), "../budget-cluster.db");

export const db = new Database(DB_PATH);
export function initDb() {
  db.exec(`
    PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      email      TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id  INTEGER NOT NULL,
      name     TEXT NOT NULL,
      amount   REAL NOT NULL,
      type     TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
      category TEXT,
      date     TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS tags (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name    TEXT NOT NULL,
      color   TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transaction_tags (
      transaction_id INTEGER,
      tag_id         INTEGER,
      PRIMARY KEY (transaction_id, tag_id),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id),
      FOREIGN KEY (tag_id)         REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id             TEXT PRIMARY KEY,
      user_id        INTEGER NOT NULL,
      name           TEXT NOT NULL,
      description    TEXT,
      target_amount  REAL NOT NULL,
      current_amount REAL NOT NULL,
      auto_save      BOOLEAN,
      monthly_rate   REAL,
      target_date    TEXT,
      color_class    TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS deposits (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id TEXT NOT NULL,
      date    TEXT NOT NULL,
      amount  REAL NOT NULL,
      FOREIGN KEY (goal_id) REFERENCES savings_goals(id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id          TEXT PRIMARY KEY,
      user_id     INTEGER NOT NULL,
      title       TEXT NOT NULL,
      content     TEXT NOT NULL DEFAULT '',
      category    TEXT NOT NULL DEFAULT 'Ideen',
      is_favorite BOOLEAN NOT NULL DEFAULT 0,
      created_at  DATETIME NOT NULL,
      updated_at  DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id          TEXT    PRIMARY KEY,
      name        TEXT    NOT NULL,
      owner_id    INTEGER NOT NULL,
      invite_type TEXT    NOT NULL DEFAULT 'view',
      created_at  TEXT    NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id       TEXT    NOT NULL,
      user_id            INTEGER NOT NULL,
      role               TEXT    NOT NULL DEFAULT 'viewer',
      perm_dashboard     TEXT    NOT NULL DEFAULT 'view',
      perm_transactions  TEXT    NOT NULL DEFAULT 'view',
      perm_savings       TEXT    NOT NULL DEFAULT 'view',
      perm_notes         TEXT    NOT NULL DEFAULT 'view',
      joined_at          TEXT    NOT NULL,
      PRIMARY KEY (workspace_id, user_id),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workspace_requests (
      id           TEXT    PRIMARY KEY,
      from_user_id INTEGER NOT NULL,
      to_email     TEXT    NOT NULL,
      invite_type  TEXT    NOT NULL DEFAULT 'view',
      status       TEXT    NOT NULL DEFAULT 'pending',
      permissions  TEXT,
      created_at   TEXT    NOT NULL,
      FOREIGN KEY (from_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bank_connections (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER UNIQUE NOT NULL,
      access_token  TEXT NOT NULL,
      refresh_token TEXT,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // ── MIGRATIONS for older databases ──────────────────────────────────
  try { db.exec(`ALTER TABLE tags ADD COLUMN user_id INTEGER REFERENCES users(id);`); } catch {}
  try { db.exec(`ALTER TABLE transactions ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'`); } catch {}
  try { db.exec(`ALTER TABLE workspaces ADD COLUMN invite_type TEXT NOT NULL DEFAULT 'view'`); } catch {}
  try { db.exec(`ALTER TABLE workspace_requests ADD COLUMN invite_type TEXT NOT NULL DEFAULT 'view'`); } catch {}
  try {
    db.exec(`ALTER TABLE workspace_members ADD COLUMN perm_dashboard TEXT NOT NULL DEFAULT 'view'`);
    console.log("Migrated: added perm_dashboard column to workspace_members");
  } catch {}

  // ── Test user / seed (unchanged) ────────────────────────────────────
  db.prepare(
    `INSERT OR IGNORE INTO users (id, name, email, password)
     VALUES (1, 'Test User', 'test@test.com', 'password')`
  ).run();

  const savingsCount = (
    db.prepare(`SELECT COUNT(*) as c FROM savings_goals WHERE user_id = 1`).get() as any
  ).c;
  if (savingsCount === 0) {
    db.prepare(
      `INSERT INTO savings_goals (id, user_id, name, description, target_amount, current_amount, auto_save, monthly_rate, target_date, color_class)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("1", "Notgroschen", "3 Monatsgehälter als Reserve", 10000, 4200, 1, 300, "2026-07-01", "color-violet");
    db.prepare(
      `INSERT INTO savings_goals (id, user_id, name, description, target_amount, current_amount, auto_save, monthly_rate, target_date, color_class)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("2", "Neues Auto", null, 15000, 3000, 0, null, null, "color-rose");
    const insertDeposit = db.prepare(`INSERT INTO deposits (goal_id, date, amount) VALUES (?, ?, ?)`);
    insertDeposit.run("1", "2026-02-01", 300);
    insertDeposit.run("1", "2026-01-01", 300);
    insertDeposit.run("1", "2025-12-01", 300);
    console.log("Savings seed data inserted");
  }

  const noteCount = (
    db.prepare(`SELECT COUNT(*) as c FROM notes WHERE user_id = 1`).get() as any
  ).c;
  if (noteCount === 0) {
    const now = new Date().toISOString();
    const insertNote = db.prepare(`
      INSERT INTO notes (id, user_id, title, content, category, is_favorite, created_at, updated_at)
      VALUES (?, 1, ?, ?, ?, 0, ?, ?)
    `);
    insertNote.run("note-id-1", "Steuererklärung 2024", "<b>Benötigte Dokumente:</b><br>- Lohnsteuerbescheinigung<br>- Versicherungsnachweise", "Rechnungen", now, now);
    insertNote.run("note-id-2", "ETF Sparplan Strategie", "<b>Ziel:</b> 500 € monatlich<br>- 70 % MSCI World<br>- 20 % EM<br>- 10 % Bonds", "Sparpläne", now, now);
    insertNote.run("note-id-3", "App-Idee: Budget Tracker", "Gamification für Sparziele.<br>- Streak-System<br>- Badges", "Ideen", now, now);
    console.log("Notes seed data inserted");
  }

  console.log("Database initialized");
}
