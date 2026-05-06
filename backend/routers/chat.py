import uuid
import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.models import ChatSession, ChatMessage, SessionStatus
from database.deps import get_db, SessionLocal
from agent.graph import astream_chat_with_agent, generate_session_title

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Chat"])

class ChatMessageBase(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    history: Optional[List[ChatMessageBase]] = []

class ChatResponse(BaseModel):
    reply: str
    session_id: str

@router.post("/chat")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    session_id = request.session_id
    new_session_created = False
    if not session_id:
        session_id = str(uuid.uuid4())
        db_session = ChatSession(id=session_id)
        db.add(db_session)
        db.commit()
        new_session_created = True
    else:
        db_session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not db_session:
            db_session = ChatSession(id=session_id)
            db.add(db_session)
            db.commit()
            new_session_created = True
            
    if new_session_created or not db_session.title:
        try:
            title = await generate_session_title(request.message)
            db_session.title = title
            db.commit()
        except Exception as e:
            logger.error(f"Failed to generate title: {e}")

    user_msg = ChatMessage(session_id=session_id, role="user", content=request.message)
    db.add(user_msg)
    db.commit()
    
    if db_session.status == SessionStatus.HUMAN_AGENT:
        async def human_agent_generator():
            reply = "（人工客服已收到您的消息，请稍候...）"
            yield f"data: {json.dumps({'chunk': reply, 'session_id': session_id, 'status': 'HUMAN_AGENT'}, ensure_ascii=False)}\n\n"
            
            db_gen = SessionLocal()
            try:
                ai_msg = ChatMessage(session_id=session_id, role="assistant", content=reply)
                db_gen.add(ai_msg)
                db_gen.commit()
            finally:
                db_gen.close()
            yield "data: [DONE]\n\n"
        return StreamingResponse(human_agent_generator(), media_type="text/event-stream")

    async def event_generator():
        history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history]
        full_reply = ""
        is_handoff = False
        
        try:
            async for chunk in astream_chat_with_agent(request.message, history=history_dicts):
                full_reply += chunk
                if "[转接人工]" in chunk or "[HUMAN_HANDOFF_TRIGGERED]" in full_reply:
                    is_handoff = True
                
                clean_chunk = chunk.replace("[HUMAN_HANDOFF_TRIGGERED]", "")
                if clean_chunk:
                    yield f"data: {json.dumps({'chunk': clean_chunk, 'session_id': session_id, 'status': 'HUMAN_AGENT' if is_handoff else 'AI_AGENT'}, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"Stream error: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': 'Internal server error'})}\n\n"
        finally:
            if full_reply:
                db_gen = SessionLocal()
                try:
                    if is_handoff:
                        db_s = db_gen.query(ChatSession).filter(ChatSession.id == session_id).first()
                        if db_s:
                            db_s.status = SessionStatus.HUMAN_AGENT
                    
                    ai_msg = ChatMessage(session_id=session_id, role="assistant", content=full_reply.replace("[HUMAN_HANDOFF_TRIGGERED]", ""))
                    db_gen.add(ai_msg)
                    db_gen.commit()
                finally:
                    db_gen.close()
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
