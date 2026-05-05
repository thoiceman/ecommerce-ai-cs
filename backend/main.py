import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import uvicorn
import logging

from agent.graph import chat_with_agent

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

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    reply: str

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        # 将 pydantic 对象转为字典列表
        history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history]
        
        # 将同步的阻塞调用放入线程池执行
        reply = await asyncio.to_thread(chat_with_agent, request.message, history=history_dicts)
        
        return ChatResponse(reply=reply)
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误，请稍后重试。")

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "服务运行正常"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
