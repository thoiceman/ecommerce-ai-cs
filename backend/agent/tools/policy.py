from langchain_core.tools import tool
from agent.rag_tool import query_policy

@tool
def search_policy(query: str) -> str:
    """
    当用户询问关于退换货政策、运费规则、退款时效等相关规定时，调用此工具。
    
    Args:
        query: 用户的具体疑问，例如"退货运费谁出"
    """
    return query_policy(query)
