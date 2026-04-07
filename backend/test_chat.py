import json
import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("OPENROUTER_API_KEY", "test-key")

from chat import next_question  # noqa: E402
from main import app  # noqa: E402

client = TestClient(app)


def make_llm_response(reply: str, field_updates: dict) -> MagicMock:
    """Build a mock litellm completion response."""
    content = json.dumps(
        {
            "reply": reply,
            "field_updates": {
                "purpose": None,
                "effectiveDate": None,
                "mndaTermType": None,
                "mndaTermYears": None,
                "confidentialityTermType": None,
                "confidentialityTermYears": None,
                "governingLaw": None,
                "jurisdiction": None,
                "modifications": None,
                "party1Name": None,
                "party1Title": None,
                "party1Company": None,
                "party1NoticeAddress": None,
                "party1Date": None,
                "party2Name": None,
                "party2Title": None,
                "party2Company": None,
                "party2NoticeAddress": None,
                "party2Date": None,
                **field_updates,
            },
        }
    )
    mock_response = MagicMock()
    mock_response.choices[0].message.content = content
    return mock_response


# ── next_question unit tests ──────────────────────────────────────────────────

def test_next_question_empty_fields_asks_purpose():
    assert next_question({}) == "What is the purpose of this agreement — how will confidential information be used?"


def test_next_question_skips_filled_fields():
    fields = {"purpose": "Testing", "effectiveDate": "2026-04-06"}
    q = next_question(fields)
    assert "how long" in q.lower() or "last" in q.lower()


def test_next_question_asks_mndaTermYears_when_type_is_years():
    fields = {"purpose": "x", "effectiveDate": "2026-01-01", "mndaTermType": "years"}
    q = next_question(fields)
    assert "how many years" in q.lower()


def test_next_question_skips_mndaTermYears_when_type_is_until_terminated():
    fields = {
        "purpose": "x", "effectiveDate": "2026-01-01",
        "mndaTermType": "until_terminated",
    }
    q = next_question(fields)
    # Should move on to confidentialityTermType
    assert "confidentiality" in q.lower() or "perpetuity" in q.lower()


def test_next_question_returns_none_when_all_fields_filled():
    all_fields = {
        "purpose": "Testing",
        "effectiveDate": "2026-01-01",
        "mndaTermType": "until_terminated",
        "confidentialityTermType": "perpetual",
        "governingLaw": "Delaware",
        "jurisdiction": "courts in Wilmington, DE",
        "party1Name": "Alice",
        "party1Title": "CEO",
        "party1Company": "Acme Inc",
        "party1NoticeAddress": "alice@acme.com",
        "party1Date": "2026-01-01",
        "party2Name": "Bob",
        "party2Title": "CTO",
        "party2Company": "Globex Corp",
        "party2NoticeAddress": "bob@globex.com",
        "party2Date": "2026-01-01",
        "modifications": "none",
    }
    assert next_question(all_fields) is None


# ── endpoint tests ────────────────────────────────────────────────────────────

@patch("chat.completion")
def test_reply_gets_next_question_appended_when_ai_omits_it(mock_completion):
    """If the AI reply has no question mark, the backend appends the next question."""
    mock_completion.return_value = make_llm_response(
        reply="Got it — I've set the purpose to 'Testing.'",  # no ?
        field_updates={"purpose": "Testing"},
    )

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "Testing"}],
            "current_fields": {},
        },
    )

    assert response.status_code == 200
    reply = response.json()["reply"]
    assert reply.endswith("?"), f"Expected reply to end with '?', got: {reply!r}"


@patch("chat.completion")
def test_reply_not_modified_when_ai_already_asks_question(mock_completion):
    """If the AI already ends with '?', the backend leaves the reply unchanged."""
    mock_completion.return_value = make_llm_response(
        reply="Got it! What date should this agreement be effective from?",
        field_updates={"purpose": "Testing"},
    )

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "Testing"}],
            "current_fields": {},
        },
    )

    assert response.status_code == 200
    reply = response.json()["reply"]
    assert reply == "Got it! What date should this agreement be effective from?"


@patch("chat.completion")
def test_reply_signals_completion_when_all_fields_filled(mock_completion):
    """When all fields are present and AI omits a question, completion message is appended."""
    mock_completion.return_value = make_llm_response(
        reply="All done.",
        field_updates={"modifications": "none"},
    )

    all_fields = {
        "purpose": "Testing", "effectiveDate": "2026-01-01",
        "mndaTermType": "until_terminated", "confidentialityTermType": "perpetual",
        "governingLaw": "Delaware", "jurisdiction": "courts in Wilmington, DE",
        "party1Name": "Alice", "party1Title": "CEO", "party1Company": "Acme",
        "party1NoticeAddress": "alice@acme.com", "party1Date": "2026-01-01",
        "party2Name": "Bob", "party2Title": "CTO", "party2Company": "Globex",
        "party2NoticeAddress": "bob@globex.com", "party2Date": "2026-01-01",
    }

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "No changes"}],
            "current_fields": all_fields,
        },
    )

    assert response.status_code == 200
    reply = response.json()["reply"]
    assert "pdf" in reply.lower() or "download" in reply.lower() or "complete" in reply.lower()


@patch("chat.completion")
def test_chat_filters_null_field_updates(mock_completion):
    mock_completion.return_value = make_llm_response(
        reply="Got it — what date?",
        field_updates={"purpose": "Testing", "governingLaw": None},
    )

    response = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "Testing"}], "current_fields": {}},
    )

    assert response.status_code == 200
    assert "purpose" in response.json()["field_updates"]
    assert "governingLaw" not in response.json()["field_updates"]


@patch("chat.completion")
def test_chat_strips_signatures_from_current_fields(mock_completion):
    mock_completion.return_value = make_llm_response(reply="Hi, what date?", field_updates={})

    client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "Hi"}],
            "current_fields": {
                "party1Signature": "data:image/png;base64,AAAA",
                "party2Signature": "data:image/png;base64,BBBB",
                "governingLaw": "California",
            },
        },
    )

    _, kwargs = mock_completion.call_args
    context = next(m for m in kwargs["messages"] if "Current NDA field values" in m.get("content", ""))
    assert "party1Signature" not in context["content"]
    assert "governingLaw" in context["content"]


@patch("chat.completion")
def test_chat_returns_502_on_llm_error(mock_completion):
    mock_completion.side_effect = Exception("Connection refused")

    response = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "Hi"}], "current_fields": {}},
    )

    assert response.status_code == 502
    assert "AI service error" in response.json()["detail"]


def test_chat_returns_500_when_api_key_missing(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    response = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "Hi"}], "current_fields": {}},
    )

    assert response.status_code == 500
    assert "OPENROUTER_API_KEY" in response.json()["detail"]
