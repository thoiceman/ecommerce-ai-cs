import asyncio
import uuid
import json
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import uvicorn
import logging

from sqlalchemy.orm import Session
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker

from database.models import Base, ChatSession, ChatMessage, SessionStatus
from agent.graph import chat_with_agent, astream_chat_with_agent, generate_session_title
import os
from dotenv import load_dotenv

load_dotenv()

# DB 设置
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ecommerce_ai.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Customer Service API", description="电商售后智能客服系统 API")

# 配置 CORS，允许前端跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境请指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    # 确保 session_id
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
            
    # 如果是新会话，生成标题
    if new_session_created or not db_session.title:
        try:
            # 异步生成标题并更新
            title = await generate_session_title(request.message)
            db_session.title = title
            db.commit()
        except Exception as e:
            logger.error(f"Failed to generate title: {e}")

    # 存入用户消息
    user_msg = ChatMessage(session_id=session_id, role="user", content=request.message)
    db.add(user_msg)
    db.commit()
    
    # 如果已经是人工客服状态，则直接保存消息，不走大模型
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
        # 这里为了简化，我们仅从请求中获取 history，也可以直接从 DB 读取
        history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history]
        full_reply = ""
        is_handoff = False
        
        try:
            async for chunk in astream_chat_with_agent(request.message, history=history_dicts):
                full_reply += chunk
                if "[转接人工]" in chunk or "[HUMAN_HANDOFF_TRIGGERED]" in full_reply:
                    is_handoff = True
                
                # 过滤掉内部标识不输出给前端
                clean_chunk = chunk.replace("[HUMAN_HANDOFF_TRIGGERED]", "")
                if clean_chunk:
                    yield f"data: {json.dumps({'chunk': clean_chunk, 'session_id': session_id, 'status': 'HUMAN_AGENT' if is_handoff else 'AI_AGENT'}, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"Stream error: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': 'Internal server error'})}\n\n"
        finally:
            # 结束后将助理回复存入数据库
            if full_reply:
                # 因为路由可能已经返回，重新获取 session
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

@app.get("/api/sessions")
def get_sessions(db: Session = Depends(get_db)):
    sessions = db.query(ChatSession).order_by(desc(ChatSession.created_at)).all()
    return [{"id": s.id, "title": s.title, "created_at": s.created_at, "status": s.status} for s in sessions]

@app.get("/api/sessions/{session_id}/messages")
def get_session_messages(session_id: str, db: Session = Depends(get_db)):
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at).all()
    return [{"role": m.role, "content": m.content, "created_at": m.created_at} for m in messages]

from agent.rag_tool import add_document_to_db

class KBRequest(BaseModel):
    content: str
    source: str = "custom_upload.md"

@app.post("/api/admin/kb")
def upload_knowledge_base(request: KBRequest):
    try:
        chunks_count = add_document_to_db(request.content, request.source)
        return {"status": "ok", "message": f"成功添加 {chunks_count} 个知识块"}
    except Exception as e:
        logger.error(f"KB upload error: {e}")
        raise HTTPException(status_code=500, detail="知识库更新失败")

@app.get("/api/admin/stats")
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

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "服务运行正常"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
