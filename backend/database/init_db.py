import os
import sys

# 将 backend 目录添加到 sys.path 中，解决直接运行脚本时的相对导入报错
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from database.models import Base, User, Product, Order, OrderStatus, ChatSession, ChatMessage, SessionStatus

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ecommerce_ai.db")

def init_db():
    try:
        # SQLite 需要特殊的 connect_args
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
        
        # 如果存在则删除，重新创建（仅用于Demo）
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        # 插入一些模拟数据
        user1 = User(username="张三", phone="13800138000")
        user2 = User(username="李四", phone="13900139000")
        db.add_all([user1, user2])
        db.commit()
        
        prod1 = Product(name="苹果 iPhone 15 Pro", price=7999.0, description="最新款智能手机")
        prod2 = Product(name="Sony 降噪耳机", price=2499.0, description="头戴式无线蓝牙耳机")
        db.add_all([prod1, prod2])
        db.commit()
        
        order1 = Order(
            order_no="ORD20250505001",
            user_id=user1.id,
            product_id=prod1.id,
            amount=7999.0,
            status=OrderStatus.SHIPPED,
            logistics_info="顺丰速运：您的快件已到达杭州分拨中心"
        )
        order2 = Order(
            order_no="ORD20250505002",
            user_id=user2.id,
            product_id=prod2.id,
            amount=2499.0,
            status=OrderStatus.RETURNED,
            logistics_info="退货物流：商家已签收，正在处理退款"
        )
        db.add_all([order1, order2])
        db.commit()
        
        print("数据库初始化完成，已插入模拟测试数据。")
        print("可用测试订单号：ORD20250505001 (张三的手机), ORD20250505002 (李四的耳机)")
        db.close()
    except Exception as e:
        print(f"数据库初始化失败: {e}")

if __name__ == "__main__":
    init_db()
