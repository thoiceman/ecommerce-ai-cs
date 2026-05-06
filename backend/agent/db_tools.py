import os
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from langchain_core.tools import tool

from database.models import Order, User, Product, OrderStatus
from database.deps import SessionLocal

@tool
def get_recent_orders() -> str:
    """
    当用户询问售后订单、退货、物流，但没有提供具体的订单号时，调用此工具获取用户的近期历史订单列表。
    """
    db = SessionLocal()
    try:
        # 为了演示，暂时固定查询 user_id = 1 (张三) 的订单
        orders = db.query(Order).filter(Order.user_id == 1).order_by(Order.created_at.desc()).limit(5).all()
        
        if not orders:
            return json.dumps([])
            
        order_list = []
        for order in orders:
            product_name = order.product.name if order.product else "未知商品"
            order_list.append({
                "order_no": order.order_no,
                "product_name": product_name,
                "amount": order.amount,
                "status": order.status.value,
                "created_at": order.created_at.strftime("%Y-%m-%d %H:%M")
            })
            
        return json.dumps(order_list, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)
    finally:
        db.close()

@tool
def get_order_status(order_no: str) -> str:
    """
    通过订单号查询订单的状态和物流信息。
    
    Args:
        order_no: 订单编号，例如 ORD20250505001
    """
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.order_no == order_no).first()
        if not order:
            return f"抱歉，没有找到订单号为 {order_no} 的订单，请检查订单号是否正确。"
        
        product_name = order.product.name if order.product else "未知商品"
        
        return (
            f"订单号: {order.order_no}\n"
            f"购买商品: {product_name}\n"
            f"订单金额: {order.amount}元\n"
            f"当前状态: {order.status.value}\n"
            f"物流信息: {order.logistics_info or '暂无物流信息'}"
        )
    except Exception as e:
        return f"查询订单时发生错误: {str(e)}"
    finally:
        db.close()

@tool
def request_return(order_no: str, reason: str) -> str:
    """
    为指定订单发起退货申请。只有状态为“已发货”或“已送达”的订单才能申请退货。
    
    Args:
        order_no: 订单编号，例如 ORD20250505001
        reason: 退货原因
    """
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.order_no == order_no).first()
        if not order:
            return f"抱歉，没有找到订单号为 {order_no} 的订单。"
        
        if order.status not in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
            return f"该订单当前状态为【{order.status.value}】，无法直接发起退货申请。如有疑问请联系人工客服。"
        
        # 更新状态为退货中
        order.status = OrderStatus.RETURNING
        order.logistics_info = f"用户发起退货申请。原因: {reason}。等待商家审核。"
        db.commit()
        
        return f"订单 {order_no} 的退货申请已成功提交，我们将尽快为您处理。您可以随时查询该订单的最新状态。"
    except Exception as e:
        db.rollback()
        return f"提交退货申请时发生错误: {str(e)}"
    finally:
        db.close()
