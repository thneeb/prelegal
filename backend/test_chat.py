import json
import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("OPENROUTER_API_KEY", "test-key")

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


@patch("chat.completion")
def test_chat_returns_reply_and_field_updates(mock_completion):
    mock_completion.return_value = make_llm_response(
        reply="What is the purpose of this NDA?",
        field_updates={"governingLaw": "Delaware"},
    )

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "Hello"}],
            "current_fields": {},
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["reply"] == "What is the purpose of this NDA?"
    assert data["field_updates"] == {"governingLaw": "Delaware"}


@patch("chat.completion")
def test_chat_filters_null_field_updates(mock_completion):
    mock_completion.return_value = make_llm_response(
        reply="Got it!",
        field_updates={"purpose": "Testing", "governingLaw": None},
    )

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "Testing"}],
            "current_fields": {},
        },
    )

    assert response.status_code == 200
    data = response.json()
    # Only non-null field updates should be returned
    assert "purpose" in data["field_updates"]
    assert "governingLaw" not in data["field_updates"]


@patch("chat.completion")
def test_chat_strips_signatures_from_current_fields(mock_completion):
    mock_completion.return_value = make_llm_response(reply="Hi!", field_updates={})

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
    messages_sent = kwargs["messages"]
    context_message = next(
        m for m in messages_sent if "Current NDA field values" in m.get("content", "")
    )
    assert "party1Signature" not in context_message["content"]
    assert "party2Signature" not in context_message["content"]
    assert "governingLaw" in context_message["content"]


@patch("chat.completion")
def test_chat_returns_502_on_llm_error(mock_completion):
    mock_completion.side_effect = Exception("Connection refused")

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "Hi"}],
            "current_fields": {},
        },
    )

    assert response.status_code == 502
    assert "AI service error" in response.json()["detail"]


def test_chat_returns_500_when_api_key_missing(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "Hi"}],
            "current_fields": {},
        },
    )

    assert response.status_code == 500
    assert "OPENROUTER_API_KEY" in response.json()["detail"]
