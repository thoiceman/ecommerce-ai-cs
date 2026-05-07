import os
import sys

# 将 backend 目录添加到 sys.path 中，解决直接运行脚本时的相对导入报错
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from database.models import Base
from database.seed_demo import seed_demo_data_if_empty

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ecommerce_ai.db")


def init_db():
    """清空并重建库，再写入演示数据（仅用于本地 / Demo 重置，勿在生产有数据时使用）。"""
    try:
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        try:
            seed_demo_data_if_empty(db)
        finally:
            db.close()

        print("数据库初始化完成，已插入模拟测试数据。")
        print(
            "可用测试订单号：ORD20250505001, ORD20250505003, ORD20250505004 (张三的订单), "
            "ORD20250505002 (李四的耳机)"
        )
    except Exception as e:
        print(f"数据库初始化失败: {e}")


if __name__ == "__main__":
    init_db()
