import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database.models import ChatSession, ChatMessage, SessionStatus
from database.deps import get_db
from agent.rag_tool import add_document_to_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["Admin"])

class KBRequest(BaseModel):
    content: str
    source: str = "custom_upload.md"

@router.post("/kb")
def upload_knowledge_base(request: KBRequest):
    try:
        chunks_count = add_document_to_db(request.content, request.source)
        return {"status": "ok", "message": f"成功添加 {chunks_count} 个知识块"}
    except Exception as e:
        logger.error(f"KB upload error: {e}")
        raise HTTPException(status_code=500, detail="知识库更新失败")

@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    total_sessions = db.query(ChatSession).count()
    human_sessions = db.query(ChatSession).filter(ChatSession.status == SessionStatus.HUMAN_AGENT).count()
    total_messages = db.query(ChatMessage).count()
    
    ai_resolve_rate = 100.0
    if total_sessions > 0:
        ai_resolve_rate = ((total_sessions - human_sessions) / total_sessions) * 100
        
    return {
        "total_sessions": total_sessions,
        "human_sessions": human_sessions,
        "total_messages": total_messages,
        "ai_resolve_rate": round(ai_resolve_rate, 2)
    }
