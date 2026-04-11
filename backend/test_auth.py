"""Tests for auth endpoints and JWT validation."""
import os
import sqlite3

import pytest
from fastapi.testclient import TestClient

from auth import create_token
from database import init_db
from main import app

client = TestClient(app)

_DB_PATH = os.environ["DB_PATH"]


@pytest.fixture(autouse=True)
def clean_db():
    """Re-initialise tables and clear data before each test."""
    init_db()
    conn = sqlite3.connect(_DB_PATH)
    conn.execute("DELETE FROM documents")
    conn.execute("DELETE FROM users")
    conn.commit()
    conn.close()
    yield


# ── Signup ────────────────────────────────────────────────────────────────────

def test_signup_creates_user_and_returns_token():
    res = client.post(
        "/api/signup",
        json={"name": "Alice", "email": "alice@example.com", "password": "secret99"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["email"] == "alice@example.com"
    assert data["name"] == "Alice"


def test_signup_rejects_short_password():
    res = client.post(
        "/api/signup",
        json={"name": "Bob", "email": "bob@example.com", "password": "short"},
    )
    assert res.status_code == 422


def test_signup_rejects_duplicate_email():
    payload = {"name": "Alice", "email": "dup@example.com", "password": "password1"}
    client.post("/api/signup", json=payload)
    res = client.post("/api/signup", json=payload)
    assert res.status_code == 409
    assert "already registered" in res.json()["detail"]


# ── Login ─────────────────────────────────────────────────────────────────────

def test_login_returns_token_for_valid_credentials():
    client.post(
        "/api/signup",
        json={"name": "Carol", "email": "carol@example.com", "password": "password1"},
    )
    res = client.post(
        "/api/login",
        json={"email": "carol@example.com", "password": "password1"},
    )
    assert res.status_code == 200
    assert "token" in res.json()


def test_login_rejects_wrong_password():
    client.post(
        "/api/signup",
        json={"name": "Dave", "email": "dave@example.com", "password": "password1"},
    )
    res = client.post(
        "/api/login",
        json={"email": "dave@example.com", "password": "wrongpass"},
    )
    assert res.status_code == 401


def test_login_rejects_unknown_email():
    res = client.post(
        "/api/login",
        json={"email": "nobody@example.com", "password": "password1"},
    )
    assert res.status_code == 401


# ── JWT validation ────────────────────────────────────────────────────────────

def test_protected_route_rejects_missing_token():
    res = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hi"}], "current_fields": {}},
    )
    assert res.status_code == 401


def test_protected_route_rejects_invalid_token():
    res = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hi"}], "current_fields": {}},
        headers={"Authorization": "Bearer not.a.valid.token"},
    )
    assert res.status_code == 401


def test_protected_route_accepts_valid_token():
    """A well-formed JWT passes the auth check and returns data, not 401."""
    token = create_token(999, "ghost@example.com", "Ghost")
    res = client.get(
        "/api/documents",
        headers={"Authorization": f"Bearer {token}"},
    )
    # user_id 999 has no documents — should return empty list, not 401
    assert res.status_code == 200
    assert res.json() == []
