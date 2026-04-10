"""Tests for document selection endpoint and document_configs."""
import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from auth import create_token  # noqa: E402
from document_configs import DOCUMENT_CONFIGS  # noqa: E402
from main import app  # noqa: E402

client = TestClient(app)

_AUTH = {"Authorization": f"Bearer {create_token(1, 'test@test.com', 'Test')}"}


# ── document_configs unit tests ───────────────────────────────────────────────

def test_all_expected_doc_types_registered():
    expected = {
        "ai-addendum", "baa", "csa", "design-partner", "dpa",
        "partnership", "pilot", "psa", "sla", "software-license",
    }
    assert expected == set(DOCUMENT_CONFIGS.keys())


def test_each_config_has_llm_response_model():
    for doc_id, config in DOCUMENT_CONFIGS.items():
        assert hasattr(config, "llm_response_model"), f"{doc_id} missing llm_response_model"


def test_each_config_has_field_questions():
    for doc_id, config in DOCUMENT_CONFIGS.items():
        assert len(config.field_questions) >= 5, f"{doc_id} has too few questions"


def test_field_to_placeholder_covers_party_fields():
    for doc_id, config in DOCUMENT_CONFIGS.items():
        assert "party1Company" in config.field_to_placeholder, f"{doc_id} missing party1Company placeholder"
        assert "party2Company" in config.field_to_placeholder, f"{doc_id} missing party2Company placeholder"


def test_llm_response_model_accepts_known_fields():
    config = DOCUMENT_CONFIGS["csa"]
    model = config.llm_response_model
    # Should accept all defined fields plus extra unknown ones (pydantic ignores extras by default)
    instance = model(
        reply="Hello",
        field_updates={"effectiveDate": "2026-01-01", "governingLaw": "Delaware"},
    )
    assert instance.reply == "Hello"
    assert instance.field_updates.effectiveDate == "2026-01-01"  # type: ignore[attr-defined]


# ── Generic chat endpoint tests ───────────────────────────────────────────────

def make_generic_llm_response(reply: str, field_updates: dict, doc_id: str) -> MagicMock:
    """Build a mock litellm completion response for a generic document."""
    import json
    fields_payload = {fq.field_name: None for fq in DOCUMENT_CONFIGS[doc_id].field_questions}
    fields_payload.update(field_updates)
    content = json.dumps({"reply": reply, "field_updates": fields_payload})
    mock_response = MagicMock()
    mock_response.choices[0].message.content = content
    return mock_response


@patch("chat.completion")
def test_generic_chat_returns_field_updates(mock_completion):
    mock_completion.return_value = make_generic_llm_response(
        reply="Got it — subscription period set.",
        field_updates={"subscriptionPeriod": "1 year"},
        doc_id="csa",
    )

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "1 year"}],
            "current_fields": {},
            "document_type": "csa",
        },
        headers=_AUTH,
    )

    assert response.status_code == 200
    assert "subscriptionPeriod" in response.json()["field_updates"]


@patch("chat.completion")
def test_generic_chat_appends_next_question(mock_completion):
    mock_completion.return_value = make_generic_llm_response(
        reply="Got it.",  # no ?
        field_updates={"effectiveDate": "2026-01-01"},
        doc_id="pilot",
    )

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "today"}],
            "current_fields": {},
            "document_type": "pilot",
        },
        headers=_AUTH,
    )

    assert response.status_code == 200
    reply = response.json()["reply"]
    assert reply.endswith("?"), f"Expected ? at end, got: {reply!r}"


@patch("chat.completion")
def test_generic_chat_signals_completion(mock_completion):
    """When all fields are filled and AI gives no question, completion message is appended."""
    config = DOCUMENT_CONFIGS["pilot"]
    all_fields = {fq.field_name: "filled" for fq in config.field_questions}

    mock_completion.return_value = make_generic_llm_response(
        reply="All done.",
        field_updates={},
        doc_id="pilot",
    )

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "No changes"}],
            "current_fields": all_fields,
            "document_type": "pilot",
        },
        headers=_AUTH,
    )

    assert response.status_code == 200
    reply = response.json()["reply"]
    assert "pdf" in reply.lower() or "complete" in reply.lower() or "download" in reply.lower()


def test_generic_chat_returns_400_for_unknown_doc_type():
    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "hi"}],
            "current_fields": {},
            "document_type": "unknown-doc-xyz",
        },
        headers=_AUTH,
    )
    assert response.status_code == 400


# ── Selection endpoint tests ──────────────────────────────────────────────────

def make_selection_response(reply: str, selected_document) -> MagicMock:
    import json
    content = json.dumps({"reply": reply, "selected_document": selected_document})
    mock_response = MagicMock()
    mock_response.choices[0].message.content = content
    return mock_response


@patch("selection.completion")
def test_selection_returns_document_id(mock_completion):
    mock_completion.return_value = make_selection_response(
        reply="It sounds like you need a Mutual NDA.",
        selected_document="mnda",
    )

    response = client.post(
        "/api/select-document",
        json={"messages": [{"role": "user", "content": "I need an NDA"}]},
        headers=_AUTH,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["selected_document"] == "mnda"
    assert "NDA" in data["reply"]


@patch("selection.completion")
def test_selection_returns_null_when_no_selection(mock_completion):
    mock_completion.return_value = make_selection_response(
        reply="What kind of document do you need?",
        selected_document=None,
    )

    response = client.post(
        "/api/select-document",
        json={"messages": [{"role": "user", "content": "Help me"}]},
        headers=_AUTH,
    )

    assert response.status_code == 200
    assert response.json()["selected_document"] is None


@patch("selection.completion")
def test_selection_rejects_invalid_document_id(mock_completion):
    """If AI hallucinates a doc ID, it should be rejected and returned as null."""
    mock_completion.return_value = make_selection_response(
        reply="You need a lease agreement.",
        selected_document="lease",  # not in our catalog
    )

    response = client.post(
        "/api/select-document",
        json={"messages": [{"role": "user", "content": "I need a lease"}]},
        headers=_AUTH,
    )

    assert response.status_code == 200
    assert response.json()["selected_document"] is None


@patch("selection.completion")
def test_selection_returns_502_on_llm_error(mock_completion):
    mock_completion.side_effect = Exception("Timeout")

    response = client.post(
        "/api/select-document",
        json={"messages": [{"role": "user", "content": "hi"}]},
        headers=_AUTH,
    )

    assert response.status_code == 502
