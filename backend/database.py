import json
import os
import sqlite3

DB_PATH = os.environ.get("DB_PATH", "/data/prelegal.db")


def init_db() -> None:
    dir_path = os.path.dirname(DB_PATH)
    if dir_path:
        os.makedirs(dir_path, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                name          TEXT NOT NULL,
                email         TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL DEFAULT '',
                created_at    TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        # Migration guard: add password_hash to existing deployments
        columns = [row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()]
        if "password_hash" not in columns:
            conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                document_type TEXT NOT NULL,
                document_name TEXT NOT NULL,
                form_data     TEXT NOT NULL DEFAULT '{}',
                created_at    TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        conn.commit()
    finally:
        conn.close()


def get_user_by_email(email: str) -> dict | None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_user(name: str, email: str, password_hash: str) -> int:
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name, email, password_hash),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def save_document(
    user_id: int, document_type: str, document_name: str, form_data_json: str
) -> dict:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.execute(
            "INSERT INTO documents (user_id, document_type, document_name, form_data)"
            " VALUES (?, ?, ?, ?)",
            (user_id, document_type, document_name, form_data_json),
        )
        conn.commit()
        doc_id = cursor.lastrowid
        row = conn.execute(
            "SELECT id, document_type, document_name, created_at FROM documents WHERE id = ?",
            (doc_id,),
        ).fetchone()
        return {
            "id": row["id"],
            "document_type": row["document_type"],
            "document_name": row["document_name"],
            "created_at": row["created_at"],
        }
    finally:
        conn.close()


def get_documents_for_user(user_id: int) -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT id, document_type, document_name, created_at"
            " FROM documents WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
        return [
            {
                "id": r["id"],
                "document_type": r["document_type"],
                "document_name": r["document_name"],
                "created_at": r["created_at"],
            }
            for r in rows
        ]
    finally:
        conn.close()


def get_document_by_id(doc_id: int, user_id: int) -> dict | None:
    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT id, document_type, document_name, form_data, created_at"
            " FROM documents WHERE id = ? AND user_id = ?",
            (doc_id, user_id),
        ).fetchone()
        if row is None:
            return None
        return {
            "id": row[0],
            "document_type": row[1],
            "document_name": row[2],
            "form_data": json.loads(row[3]),
            "created_at": row[4],
        }
    finally:
        conn.close()
