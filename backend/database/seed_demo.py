"""演示用用户 / 商品 / 订单数据。仅在库中尚无用户时写入，可安全用于 Docker 首次部署。"""
import logging
from sqlalchemy.orm import Session

from database.models import User, Product, Order, OrderStatus

logger = logging.getLogger(__name__)


def insert_demo_catalog(db: Session) -> None:
    user1 = User(username="张三", phone="13800138000")
    user2 = User(username="李四", phone="13900139000")
    db.add_all([user1, user2])
    db.flush()

    prod1 = Product(name="苹果 iPhone 15 Pro", price=7999.0, description="最新款智能手机")
    prod2 = Product(name="Sony 降噪耳机", price=2499.0, description="头戴式无线蓝牙耳机")
    prod3 = Product(name="绿联 手机保护壳", price=59.0, description="全包防摔透明壳")
    prod4 = Product(name="罗技 Master 3S 鼠标", price=799.0, description="高效办公无线鼠标")
    db.add_all([prod1, prod2, prod3, prod4])
    db.flush()

    order1 = Order(
        order_no="ORD20250505001",
        user_id=user1.id,
        product_id=prod1.id,
        amount=7999.0,
        status=OrderStatus.SHIPPED,
        logistics_info="顺丰速运：您的快件已到达杭州分拨中心",
    )
    order2 = Order(
        order_no="ORD20250505002",
        user_id=user2.id,
        product_id=prod2.id,
        amount=2499.0,
        status=OrderStatus.RETURNED,
        logistics_info="退货物流：商家已签收，正在处理退款",
    )
    order3 = Order(
        order_no="ORD20250505003",
        user_id=user1.id,
        product_id=prod3.id,
        amount=59.0,
        status=OrderStatus.DELIVERED,
        logistics_info="中通快递：您的快件已签收，签收人：本人",
    )
    order4 = Order(
        order_no="ORD20250505004",
        user_id=user1.id,
        product_id=prod4.id,
        amount=799.0,
        status=OrderStatus.PENDING,
        logistics_info="暂无物流信息，等待买家付款",
    )
    db.add_all([order1, order2, order3, order4])
    db.commit()


def seed_demo_data_if_empty(db: Session) -> bool:
    """
    若已有任意用户则跳过（幂等）。
    返回 True 表示本次写入了演示数据。
    """
    if db.query(User).first() is not None:
        return False
    insert_demo_catalog(db)
    logger.info(
        "已写入演示数据：用户张三/李四，订单 ORD20250505001、ORD20250505003、"
        "ORD20250505004（张三）、ORD20250505002（李四）"
    )
    return True
