import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from routers import chat, session, admin
from agent.rag_tool import get_vector_store
from database.deps import SessionLocal, ensure_database_schema
from database.seed_demo import seed_demo_data_if_empty

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Ensuring database schema...")
    try:
        ensure_database_schema()
        logger.info("Database schema ready.")
    except Exception as e:
        logger.exception("Failed to create database tables: %s", e)
        raise
    if os.getenv("SEED_DEMO_ON_EMPTY", "true").lower() in ("1", "true", "yes"):
        db = SessionLocal()
        try:
            if seed_demo_data_if_empty(db):
                logger.info("已在空库中写入演示用户与订单数据。")
        finally:
            db.close()
    logger.info("Initializing Vector Store on startup...")
    try:
        get_vector_store()
        logger.info("Vector Store initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Vector Store: {e}")
    yield
    # 关闭时资源清理
    logger.info("Shutting down AI Customer Service API...")

app = FastAPI(
    title="AI Customer Service API", 
    description="电商售后智能客服系统 API",
    lifespan=lifespan
)

# 配置 CORS，允许前端跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境请指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(chat.router)
app.include_router(session.router)
app.include_router(admin.router)

@app.get("/api/health", tags=["System"])
async def health_check():
    return {"status": "ok", "message": "服务运行正常"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
