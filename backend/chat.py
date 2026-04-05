import json
import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from litellm import completion
from pydantic import BaseModel

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["Cerebras"]}}

SYSTEM_PROMPT = """You are a friendly legal assistant helping users fill out a Mutual Non-Disclosure Agreement (MNDA).

Your job is to collect all necessary information through natural conversation. Ask for one piece of information at a time. Be brief and professional.

The fields you need to collect are:
- purpose: How confidential information may be used between the two parties
- effectiveDate: The date the agreement starts (return in YYYY-MM-DD format)
- mndaTermType: Either "years" (expires after N years) or "until_terminated" (continues until terminated)
- mndaTermYears: Number of years as a string (only if mndaTermType is "years")
- confidentialityTermType: Either "years" or "perpetual"
- confidentialityTermYears: Number of years as a string (only if confidentialityTermType is "years")
- governingLaw: The US state whose laws govern the agreement (e.g., "Delaware")
- jurisdiction: The courts where disputes are resolved (e.g., "courts located in Wilmington, DE")
- modifications: Any modifications to the standard NDA terms (optional, leave null if none)
- party1Name, party1Title, party1Company, party1NoticeAddress, party1Date: First party details (date in YYYY-MM-DD)
- party2Name, party2Title, party2Company, party2NoticeAddress, party2Date: Second party details (date in YYYY-MM-DD)

Rules:
- Only populate field_updates with values the user has explicitly provided in this conversation
- Set fields to null if the user has not provided them yet
- Never invent or assume values
- For dates, convert natural language to YYYY-MM-DD format (e.g., "today" → today's date)
- mndaTermType must be exactly "years" or "until_terminated"
- confidentialityTermType must be exactly "years" or "perpetual"
- Year counts must be numeric strings (e.g., "2")
- Do not ask about signatures — those are handled separately in the UI
- Confirm extracted values conversationally (e.g., "Got it — I'll set the governing law to Delaware.")
- When a field is already filled in the current fields context, do not re-ask for it unless the user wants to change it"""


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

    return ChatResponse(reply=result.reply, field_updates=field_updates)
