"""
Document selection endpoint — helps users choose the right legal document.
"""
import json
import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from litellm import completion
from pydantic import BaseModel

from document_configs import DOCUMENT_CONFIGS

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["Cerebras"]}}

# MNDA is handled separately in chat.py; include it here for selection purposes
ALL_DOCUMENTS = [
    {
        "id": "mnda",
        "name": "Mutual Non-Disclosure Agreement",
        "description": (
            "Standard terms for a mutual NDA allowing both parties to share confidential "
            "information for a defined purpose, with reciprocal confidentiality obligations."
        ),
    },
    *[
        {"id": cfg.id, "name": cfg.name, "description": cfg.description}
        for cfg in DOCUMENT_CONFIGS.values()
    ],
]

CATALOG_TEXT = "\n".join(
    f"- **{d['name']}** (id: `{d['id']}`): {d['description']}"
    for d in ALL_DOCUMENTS
)

SYSTEM_PROMPT = f"""You are a friendly legal assistant helping users choose the right legal document from the Prelegal platform.

Available document types:
{CATALOG_TEXT}

Your job:
1. Listen to what the user wants and recommend the most appropriate document from the list above.
2. If the user asks for a document type we don't support (e.g. a will, lease, or employment contract), explain that we can't generate it and suggest the closest match from our catalog.
3. Once the user has chosen or you've made a clear recommendation, set selected_document to the document's id.
4. Keep replies friendly and brief (1–3 sentences). Don't ask multiple questions at once.

Rules for selected_document:
- Set it to the document id (e.g. "mnda", "csa") only when the user has confirmed their choice or your recommendation is clear.
- Leave it null if the user is still exploring or hasn't decided.
- Never invent a document id — only use ids from the list above."""


class SelectionMessage(BaseModel):
    role: str
    content: str


class SelectionRequest(BaseModel):
    messages: list[SelectionMessage]


class SelectionLLMResponse(BaseModel):
    reply: str
    selected_document: Optional[str] = None


class SelectionResponse(BaseModel):
    reply: str
    selected_document: Optional[str]


router = APIRouter()


@router.post("/api/select-document", response_model=SelectionResponse)
async def select_document_endpoint(body: SelectionRequest):
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")

    llm_messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *[{"role": m.role, "content": m.content} for m in body.messages[-20:]],
    ]

    try:
        response = completion(
            model=MODEL,
            messages=llm_messages,
            response_format=SelectionLLMResponse,
            extra_body=EXTRA_BODY,
            api_key=api_key,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1].lstrip("json").strip() if len(parts) > 1 else raw
        result = SelectionLLMResponse.model_validate_json(raw)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    # Validate selected_document if present
    valid_ids = {d["id"] for d in ALL_DOCUMENTS}
    selected = result.selected_document
    if selected and selected not in valid_ids:
        selected = None

    return SelectionResponse(reply=result.reply, selected_document=selected)
