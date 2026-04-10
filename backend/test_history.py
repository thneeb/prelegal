"""Tests for document history endpoints."""
import os
import sqlite3

import bcrypt
import pytest
from fastapi.testclient import TestClient

from auth import create_token
from database import create_user, init_db
from main import app

client = TestClient(app)

_DB_PATH = os.environ["DB_PATH"]


@pytest.fixture(autouse=True)
def clean_db():
    init_db()
    conn = sqlite3.connect(_DB_PATH)
    conn.execute("DELETE FROM documents")
    conn.execute("DELETE FROM users")
    conn.commit()
    conn.close()
    yield


def _make_user(name="Test User", email="test@example.com") -> tuple[int, str]:
    """Create a user directly and return (user_id, auth_header_value)."""
    pw_hash = bcrypt.hashpw(b"password1", bcrypt.gensalt()).decode("utf-8")
    user_id = create_user(name, email, pw_hash)
    token = create_token(user_id, email, name)
    return user_id, f"Bearer {token}"


# ── Save document ─────────────────────────────────────────────────────────────

def test_save_document_returns_record():
    _, auth = _make_user()
    res = client.post(
        "/api/documents",
        json={
            "document_type": "csa",
            "document_name": "Cloud Service Agreement: Acme / Globex",
            "form_data": {"effectiveDate": "2026-01-01", "governingLaw": "Delaware"},
        },
        headers={"Authorization": auth},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["document_type"] == "csa"
    assert "id" in data
    assert "created_at" in data


def test_save_document_strips_signatures():
    _, auth = _make_user()
    res = client.post(
        "/api/documents",
        json={
            "document_type": "mnda",
            "document_name": "Mutual NDA: A / B",
            "form_data": {
                "party1Signature": "data:image/png;base64,AAAA",
                "party2Signature": "data:image/png;base64,BBBB",
                "governingLaw": "Delaware",
            },
        },
        headers={"Authorization": auth},
    )
    assert res.status_code == 201


def test_save_document_requires_auth():
    res = client.post(
        "/api/documents",
        json={"document_type": "csa", "document_name": "test", "form_data": {}},
    )
    assert res.status_code == 401


# ── List documents ────────────────────────────────────────────────────────────

def test_list_documents_returns_user_records():
    _, auth = _make_user()
    client.post(
        "/api/documents",
        json={"document_type": "csa", "document_name": "Doc 1", "form_data": {}},
        headers={"Authorization": auth},
    )
    client.post(
        "/api/documents",
        json={"document_type": "dpa", "document_name": "Doc 2", "form_data": {}},
        headers={"Authorization": auth},
    )
    res = client.get("/api/documents", headers={"Authorization": auth})
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_list_documents_isolates_users():
    _, auth1 = _make_user("User1", "u1@example.com")
    _, auth2 = _make_user("User2", "u2@example.com")
    client.post(
        "/api/documents",
        json={"document_type": "csa", "document_name": "Doc", "form_data": {}},
        headers={"Authorization": auth1},
    )
    res = client.get("/api/documents", headers={"Authorization": auth2})
    assert res.json() == []


# ── Get document ──────────────────────────────────────────────────────────────

def test_get_document_returns_form_data():
    _, auth = _make_user()
    save_res = client.post(
        "/api/documents",
        json={
            "document_type": "csa",
            "document_name": "CSA: A / B",
            "form_data": {"governingLaw": "Delaware"},
        },
        headers={"Authorization": auth},
    )
    doc_id = save_res.json()["id"]
    res = client.get(f"/api/documents/{doc_id}", headers={"Authorization": auth})
    assert res.status_code == 200
    assert res.json()["form_data"]["governingLaw"] == "Delaware"


def test_get_document_returns_404_for_wrong_user():
    _, auth1 = _make_user("User1", "u1@example.com")
    _, auth2 = _make_user("User2", "u2@example.com")
    save_res = client.post(
        "/api/documents",
        json={"document_type": "csa", "document_name": "Doc", "form_data": {}},
        headers={"Authorization": auth1},
    )
    doc_id = save_res.json()["id"]
    res = client.get(f"/api/documents/{doc_id}", headers={"Authorization": auth2})
    assert res.status_code == 404
