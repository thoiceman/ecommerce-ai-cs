from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import enum

Base = declarative_base()

class OrderStatus(str, enum.Enum):
    PENDING = "待支付"
    PAID = "已支付"
    SHIPPED = "已发货"
    DELIVERED = "已送达"
    CANCELLED = "已取消"
    RETURNING = "退货中"
    RETURNED = "已退货"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    phone = Column(String(20))
    
    orders = relationship("Order", back_populates="user")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True)
    price = Column(Float)
    description = Column(String(255))

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    amount = Column(Float)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    created_at = Column(DateTime, default=datetime.now)
    logistics_info = Column(String(255), nullable=True) # 模拟物流信息
    
    user = relationship("User", back_populates="orders")
    product = relationship("Product")
