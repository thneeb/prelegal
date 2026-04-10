import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from database import get_document_by_id, get_documents_for_user, save_document

_SIGNATURE_KEYS = {"party1Signature", "party2Signature"}


class SaveDocumentRequest(BaseModel):
    document_type: str
    document_name: str
    form_data: dict


class DocumentResponse(BaseModel):
    id: int
    document_type: str
    document_name: str
    created_at: str
    form_data: Optional[dict] = None


router = APIRouter()


@router.get("/api/documents", response_model=list[DocumentResponse])
async def list_docs(user: dict = Depends(get_current_user)):
    return get_documents_for_user(user["user_id"])


@router.post("/api/documents", response_model=DocumentResponse, status_code=201)
async def save_doc(body: SaveDocumentRequest, user: dict = Depends(get_current_user)):
    safe_data = {k: v for k, v in body.form_data.items() if k not in _SIGNATURE_KEYS}
    record = save_document(
        user["user_id"],
        body.document_type,
        body.document_name,
        json.dumps(safe_data),
    )
    return DocumentResponse(**record)


@router.get("/api/documents/{doc_id}", response_model=DocumentResponse)
async def get_doc(doc_id: int, user: dict = Depends(get_current_user)):
    record = get_document_by_id(doc_id, user["user_id"])
    if record is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse(**record)
