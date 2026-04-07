import json
import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from litellm import completion
from pydantic import BaseModel

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["Cerebras"]}}

SYSTEM_PROMPT = """You are a friendly legal assistant helping users fill out a Mutual Non-Disclosure Agreement (MNDA).

Your job is to extract field values from the user's messages and confirm what you understood. Keep replies brief and natural.

Field value rules:
- Only populate field_updates with values the user has explicitly provided
- Never invent or assume values
- Dates must be YYYY-MM-DD (convert natural language: "today", "next Monday", etc.)
- mndaTermType must be exactly "years" or "until_terminated"
- confidentialityTermType must be exactly "years" or "perpetual"
- Year counts must be numeric strings (e.g., "2")
- Do not ask about signatures — handled separately in the UI
- When a field is already filled in the current fields context, do not re-ask for it"""

# Ordered list of (field, question) pairs.
# None question = conditional field handled separately in next_question().
FIELD_QUESTIONS: list[tuple[str, Optional[str]]] = [
    ("purpose", "What is the purpose of this agreement — how will confidential information be used?"),
    ("effectiveDate", "What date should this agreement be effective from?"),
    ("mndaTermType", "How long should this agreement last — a specific number of years, or until terminated?"),
    ("mndaTermYears", None),  # asked only when mndaTermType == "years"
    ("confidentialityTermType", "How long should confidentiality obligations last — a specific number of years, or in perpetuity?"),
    ("confidentialityTermYears", None),  # asked only when confidentialityTermType == "years"
    ("governingLaw", "Which US state's laws should govern this agreement?"),
    ("jurisdiction", "Which courts should handle any disputes (e.g. 'courts located in Wilmington, DE')?"),
    ("party1Name", "What is the full name of the first party signing this agreement?"),
    ("party1Title", "What is Party 1's title or position?"),
    ("party1Company", "What company does Party 1 represent?"),
    ("party1NoticeAddress", "What is the notice address for Party 1 (email or postal)?"),
    ("party1Date", "What date will Party 1 sign?"),
    ("party2Name", "What is the full name of the second party signing?"),
    ("party2Title", "What is Party 2's title or position?"),
    ("party2Company", "What company does Party 2 represent?"),
    ("party2NoticeAddress", "What is the notice address for Party 2?"),
    ("party2Date", "What date will Party 2 sign?"),
    ("modifications", "Are there any modifications to the standard NDA terms, or shall we use them as-is?"),
]


def next_question(fields: dict) -> Optional[str]:
    """Return the question for the next unfilled field, or None if all are complete."""
    for field, question in FIELD_QUESTIONS:
        if field == "mndaTermYears":
            if fields.get("mndaTermType") == "years" and not fields.get("mndaTermYears"):
                return "How many years should this agreement last?"
            continue
        if field == "confidentialityTermYears":
            if fields.get("confidentialityTermType") == "years" and not fields.get("confidentialityTermYears"):
                return "How many years should the confidentiality obligation last?"
            continue
        if not fields.get(field):
            return question
    return None


class NdaFieldUpdates(BaseModel):
    purpose: Optional[str] = None
    effectiveDate: Optional[str] = None
    mndaTermType: Optional[str] = None
    mndaTermYears: Optional[str] = None
    confidentialityTermType: Optional[str] = None
    confidentialityTermYears: Optional[str] = None
    governingLaw: Optional[str] = None
    jurisdiction: Optional[str] = None
    modifications: Optional[str] = None
    party1Name: Optional[str] = None
    party1Title: Optional[str] = None
    party1Company: Optional[str] = None
    party1NoticeAddress: Optional[str] = None
    party1Date: Optional[str] = None
    party2Name: Optional[str] = None
    party2Title: Optional[str] = None
    party2Company: Optional[str] = None
    party2NoticeAddress: Optional[str] = None
    party2Date: Optional[str] = None


class LLMResponse(BaseModel):
    reply: str
    field_updates: NdaFieldUpdates


class ChatMessageModel(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessageModel]
    current_fields: dict


class ChatResponse(BaseModel):
    reply: str
    field_updates: dict


router = APIRouter()


@router.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(body: ChatRequest):
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")

    # Strip signatures from current_fields — large base64 strings the AI can't use
    safe_fields = {
        k: v
        for k, v in body.current_fields.items()
        if k not in ("party1Signature", "party2Signature")
    }

    llm_messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "system",
            "content": (
                "Current NDA field values (already filled in — do not re-ask for these "
                "unless the user wants to change them):\n"
                + json.dumps(safe_fields, indent=2)
            ),
        },
    ] + [{"role": m.role, "content": m.content} for m in body.messages[-20:]]

    try:
        response = completion(
            model=MODEL,
            messages=llm_messages,
            response_format=LLMResponse,
            extra_body=EXTRA_BODY,
            api_key=api_key,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if the model wraps JSON in ```json ... ```
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1].lstrip("json").strip() if len(parts) > 1 else raw
        result = LLMResponse.model_validate_json(raw)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    # Only return non-null field updates
    field_updates = {k: v for k, v in result.field_updates.model_dump().items() if v is not None}

    # Guarantee the reply always ends with the next question.
    # The LLM handles natural language understanding; we handle flow control.
    reply = result.reply.rstrip()
    if not reply.endswith("?"):
        all_fields = {**safe_fields, **field_updates}
        nq = next_question(all_fields)
        if nq:
            reply = reply + " " + nq
        else:
            reply = reply + " Your NDA is complete — you can now download the PDF!"

    return ChatResponse(reply=reply, field_updates=field_updates)
