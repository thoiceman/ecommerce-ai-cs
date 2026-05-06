from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database.models import ChatSession, ChatMessage
from database.deps import get_db

router = APIRouter(prefix="/api", tags=["Session"])

@router.get("/sessions")
def get_sessions(db: Session = Depends(get_db)):
    sessions = db.query(ChatSession).order_by(desc(ChatSession.created_at)).all()
    return [{"id": s.id, "title": s.title, "created_at": s.created_at, "status": s.status} for s in sessions]

@router.get("/sessions/{session_id}/messages")
def get_session_messages(session_id: str, db: Session = Depends(get_db)):
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at).all()
    return [{"role": m.role, "content": m.content, "created_at": m.created_at} for m in messages]
