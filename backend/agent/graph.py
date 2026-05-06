import os
from typing import Annotated, Sequence, TypedDict
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition

from agent.db_tools import get_order_status, request_return, get_recent_orders
from agent.rag_tool import query_policy
    
from langchain_core.tools import tool

load_dotenv()

# 将 RAG 检索也封装成一个工具供 Agent 调用
@tool
def search_policy(query: str) -> str:
    """
    当用户询问关于退换货政策、运费规则、退款时效等相关规定时，调用此工具。
    
    Args:
        query: 用户的具体疑问，例如"退货运费谁出"
    """
    return query_policy(query)

@tool
def transfer_to_human(reason: str) -> str:
    """
    当用户明确要求转人工，或者表达强烈不满、情绪激动、投诉等负面情绪时，调用此工具转接人工客服。
    
    Args:
        reason: 转接人工的原因（如"用户投诉"、"情绪激动"、"多次未能解决"等）
    """
    return "[HUMAN_HANDOFF_TRIGGERED]"

# 定义状态
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]

# 初始化大模型 (这里以兼容 OpenAI 格式的 DeepSeek/Qwen API 为例)
# 如果是 Qwen，确保 .env 中配置了 OPENAI_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1 和 OPENAI_API_KEY
llm = ChatOpenAI(
    model="qwen-max",  # 或者 qwen-plus 等
    temperature=0.1,
    max_tokens=1024
)

# 注册所有可用工具
tools = [search_policy, get_recent_orders, get_order_status, request_return, transfer_to_human]
llm_with_tools = llm.bind_tools(tools)

# 定义系统 Prompt
SYSTEM_PROMPT = """你是一个专业、礼貌的电商售后客服助手。你的目标是帮助用户解决售后问题。
请始终使用中文回答。不要编造信息。
你有以下工具可用：
1. `search_policy`: 用于查询平台的退换货政策、运费规则等。
2. `get_recent_orders`: 当用户询问售后订单、退货、物流，但没有提供具体的订单号时，调用此工具获取历史订单列表供用户选择。
3. `get_order_status`: 用于查询用户的订单状态和物流信息。
4. `request_return`: 用于帮用户申请退货。
5. `transfer_to_human`: 用于当用户明确要求转接人工，或表达出不满、投诉情绪时，主动转接人工客服。

规则：
- 如果用户问到政策问题，必须调用 `search_policy` 获取依据。
- 如果用户要求查询订单或退货但未提供订单号，请调用 `get_recent_orders` 工具（注意：调用该工具后，不需要你在回答中重复罗列订单信息，系统会自动展示给用户选择）。
- 如果用户提供了订单号，调用 `get_order_status` 工具查询。
- 如果用户情绪激动或明确要求人工，请调用 `transfer_to_human`，并且在回答中告诉用户"已为您转接人工客服"。
"""

# 定义执行大模型的节点
def call_model(state: AgentState):
    messages = state["messages"]
    # 如果没有系统提示词，就加上
    if not messages or not isinstance(messages[0], SystemMessage):
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages
    
    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}

# 构建图
workflow = StateGraph(AgentState)

# 添加节点
workflow.add_node("agent", call_model)
workflow.add_node("tools", ToolNode(tools))

# 定义边
workflow.add_edge(START, "agent")
# 决定是结束还是调用工具
workflow.add_conditional_edges(
    "agent",
    tools_condition,
)
# 工具执行完后回到 agent
workflow.add_edge("tools", "agent")

# 编译图
app = workflow.compile()

def chat_with_agent(user_input: str, history: list = None):
    """
    供外部 API 调用的便捷函数
    history: 格式为 [{'role': 'user', 'content': '...'}, {'role': 'assistant', 'content': '...'}]
    """
    messages = [SystemMessage(content=SYSTEM_PROMPT)]
    if history:
        # 滑动窗口记忆管理：只保留最近 6 条消息（3轮对话），避免 Token 超限
        window_history = history[-6:]
        for msg in window_history:
            if msg['role'] == 'user':
                messages.append(HumanMessage(content=msg['content']))
            elif msg['role'] == 'assistant':
                # 这里简化处理，不重建完整的 AIMessage + ToolCall 历史
                from langchain_core.messages import AIMessage
                messages.append(AIMessage(content=msg['content']))
                
    messages.append(HumanMessage(content=user_input))
    
    # 运行工作流
    result = app.invoke({"messages": messages})
    # 获取最后一条消息的内容
    return result["messages"][-1].content

async def astream_chat_with_agent(user_input: str, history: list = None):
    """
    供外部 API 调用的流式异步便捷函数
    """
    messages = [SystemMessage(content=SYSTEM_PROMPT)]
    if history:
        # 滑动窗口记忆管理：只保留最近 6 条消息（3轮对话），避免 Token 超限
        window_history = history[-6:]
        for msg in window_history:
            if msg['role'] == 'user':
                messages.append(HumanMessage(content=msg['content']))
            elif msg['role'] == 'assistant':
                from langchain_core.messages import AIMessage
                messages.append(AIMessage(content=msg['content']))
                
    messages.append(HumanMessage(content=user_input))
    
    async for event in app.astream_events({"messages": messages}, version="v2"):
        if event["event"] == "on_chat_model_stream":
            chunk = event["data"]["chunk"]
            if chunk.content:
                yield chunk.content
        elif event["event"] == "on_tool_start":
            yield f"\n*[正在调用工具: {event['name']}]*\n"
        elif event["event"] == "on_tool_end":
            if event['name'] == "transfer_to_human":
                yield "[HUMAN_HANDOFF_TRIGGERED]"
            elif event['name'] == "get_recent_orders":
                # 输出特殊的触发标签给前端，包含订单数据的 JSON
                output_data = event['data'].get('output', '[]')
                # 如果 output_data 是 Command 对象，LangGraph 会把它处理，这里我们假定拿到的是工具返回的 JSON 字符串
                if hasattr(output_data, 'content'):
                    output_data = output_data.content
                yield f"[ORDER_SELECTOR_TRIGGERED:{output_data}]"

async def generate_session_title(user_input: str) -> str:
    """
    根据用户的第一条消息生成简短的会话标题
    """
    prompt = f"请根据以下用户咨询内容，生成一个简短的会话标题（不超过10个字）。直接返回标题，不要有任何多余文字。\n\n内容：{user_input}"
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    return response.content.strip().strip('"').strip('“').strip('”')

if __name__ == "__main__":
    # 本地简单测试
    print(">>> User: 退货运费怎么算？")
    print(chat_with_agent("退货运费怎么算？"))
