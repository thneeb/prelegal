"""
Session-wide test configuration.
Sets environment variables before any backend module imports them at module level.
"""
import os
import tempfile

# Temp SQLite DB for the entire test session
_, _db_path = tempfile.mkstemp(suffix=".db")
os.environ.setdefault("DB_PATH", _db_path)
os.environ.setdefault("OPENROUTER_API_KEY", "test-key")
