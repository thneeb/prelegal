import json
import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from litellm import completion
from pydantic import BaseModel

from document_configs import DOCUMENT_CONFIGS, FieldQuestion

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["Cerebras"]}}

# ─── MNDA (kept as-is for backward compatibility with existing tests) ─────────

MNDA_SYSTEM_PROMPT = """You are a friendly legal assistant helping users fill out a Mutual Non-Disclosure Agreement (MNDA).

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
    """Return the question for the next unfilled MNDA field, or None if all are complete."""
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


# ─── Generic document helpers ─────────────────────────────────────────────────

GENERIC_SYSTEM_PROMPT_TEMPLATE = """You are a friendly legal assistant helping users fill out a {doc_name}.

{system_context}

Your job is to extract field values from the user's messages and confirm what you understood. Keep replies brief and natural.

Field value rules:
- Only populate field_updates with values the user has explicitly provided
- Never invent or assume values
- Dates must be YYYY-MM-DD (convert natural language: "today", "next Monday", etc.)
- Do not ask about signatures — handled separately in the UI
- When a field is already filled in the current fields context, do not re-ask for it"""


def next_question_for_doc(fields: dict, field_questions: list[FieldQuestion]) -> Optional[str]:
    """Return the next unfilled field question for a generic document config."""
    for fq in field_questions:
        if fq.condition_field:
            if fields.get(fq.condition_field) == fq.condition_value and not fields.get(fq.field_name):
                return fq.question
            continue
        if not fields.get(fq.field_name):
            return fq.question
    return None


# ─── Shared request/response models ──────────────────────────────────────────

class ChatMessageModel(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessageModel]
    current_fields: dict
    document_type: str = "mnda"


class ChatResponse(BaseModel):
    reply: str
    field_updates: dict


router = APIRouter()


@router.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(body: ChatRequest):
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")

    doc_type = body.document_type or "mnda"

    # Strip signatures from current_fields — large base64 strings the AI can't use
    safe_fields = {
        k: v
        for k, v in body.current_fields.items()
        if k not in ("party1Signature", "party2Signature")
    }

    if doc_type == "mnda":
        # ── MNDA: existing code path ──────────────────────────────────────────
        system_prompt = MNDA_SYSTEM_PROMPT
        llm_response_model = LLMResponse
        fields_context_label = "Current NDA field values"
        completion_msg = "Your NDA is complete — you can now download the PDF!"

        llm_messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "system",
                "content": (
                    f"{fields_context_label} (already filled in — do not re-ask for these "
                    "unless the user wants to change them):\n"
                    + json.dumps(safe_fields, indent=2)
                ),
            },
        ] + [{"role": m.role, "content": m.content} for m in body.messages[-20:]]

        try:
            response = completion(
                model=MODEL,
                messages=llm_messages,
                response_format=llm_response_model,
                extra_body=EXTRA_BODY,
                api_key=api_key,
            )
            raw = response.choices[0].message.content.strip()
            if raw.startswith("```"):
                parts = raw.split("```")
                raw = parts[1].lstrip("json").strip() if len(parts) > 1 else raw
            result = LLMResponse.model_validate_json(raw)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

        field_updates = {k: v for k, v in result.field_updates.model_dump().items() if v is not None}

        reply = result.reply.rstrip()
        if not reply.endswith("?"):
            all_fields = {**safe_fields, **field_updates}
            nq = next_question(all_fields)
            reply = reply + " " + (nq if nq else completion_msg)

        return ChatResponse(reply=reply, field_updates=field_updates)

    else:
        # ── Generic document: config-driven code path ─────────────────────────
        config = DOCUMENT_CONFIGS.get(doc_type)
        if not config:
            raise HTTPException(status_code=400, detail=f"Unknown document type: {doc_type}")

        system_prompt = GENERIC_SYSTEM_PROMPT_TEMPLATE.format(
            doc_name=config.name,
            system_context=config.system_context,
        )
        completion_msg = f"Your {config.name} is complete — you can now download the PDF!"

        llm_messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "system",
                "content": (
                    f"Current {config.name} field values (already filled in — do not re-ask "
                    "for these unless the user wants to change them):\n"
                    + json.dumps(safe_fields, indent=2)
                ),
            },
        ] + [{"role": m.role, "content": m.content} for m in body.messages[-20:]]

        try:
            response = completion(
                model=MODEL,
                messages=llm_messages,
                response_format=config.llm_response_model,
                extra_body=EXTRA_BODY,
                api_key=api_key,
            )
            raw = response.choices[0].message.content.strip()
            if raw.startswith("```"):
                parts = raw.split("```")
                raw = parts[1].lstrip("json").strip() if len(parts) > 1 else raw
            result = config.llm_response_model.model_validate_json(raw)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

        field_updates = {k: v for k, v in result.field_updates.model_dump().items() if v is not None}

        reply = result.reply.rstrip()
        if not reply.endswith("?"):
            all_fields = {**safe_fields, **field_updates}
            nq = next_question_for_doc(all_fields, config.field_questions)
            reply = reply + " " + (nq if nq else completion_msg)

        return ChatResponse(reply=reply, field_updates=field_updates)
