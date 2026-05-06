import json
import re
from typing import Any, Annotated, Sequence, TypedDict
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph, START
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition

from agent.tools import (
    search_policy,
    transfer_to_human,
    get_order_status,
    request_return,
    get_recent_orders
)

load_dotenv()

# 定义状态
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]

# 初始化大模型 (这里以兼容 OpenAI 格式的 DeepSeek/Qwen API 为例)
# 如果是 Qwen，确保 .env 中配置了 OPENAI_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1 和 OPENAI_API_KEY
llm = ChatOpenAI(
    model="qwen-max",  # 或者 qwen-plus 等
    temperature=0.1,
    max_tokens=1024,
    streaming=True
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
- 如果用户要求查询订单或退货但未提供订单号，请调用 `get_recent_orders` 工具。**极其重要：调用该工具后，系统会在界面上自动弹出订单卡片，你绝对不要在回复中重复输出任何订单号、商品名称等订单列表信息！** 你只需要说类似“请从下方卡片中选择您要咨询的订单”即可。
- 如果用户提供了订单号，调用 `get_order_status` 工具查询。
- 如果用户情绪激动或明确要求人工，请调用 `transfer_to_human`，并且在回答中告诉用户"已为您转接人工客服"。
"""

# 定义执行大模型的节点
async def call_model(state: AgentState, config: RunnableConfig):
    messages = state["messages"]
    # 如果没有系统提示词，就加上
    if not messages or not isinstance(messages[0], SystemMessage):
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages
    
    # Python 3.10 下需要显式透传 config，LangGraph 才能正确传播流式上下文。
    response = await llm_with_tools.ainvoke(messages, config=config)
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

CONTROL_TOKEN_PATTERNS = (
    re.compile(r"\[ORDER_SELECTOR_TRIGGERED:\[[\s\S]*?\]\]"),
    re.compile(r"\[HUMAN_HANDOFF_TRIGGERED\]"),
    re.compile(r"\[TOOL_EVENT:\{[\s\S]*?\}\]"),
    re.compile(r"\*\[正在调用工具:\s*([^[\]*]+?)\]\*"),
)


def _strip_control_tokens(text: str) -> str:
    """移除仅供前端展示或交互使用的控制标记，避免污染后续对话历史。"""
    cleaned = text or ""
    for pattern in CONTROL_TOKEN_PATTERNS:
        cleaned = pattern.sub("", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _build_tool_event(event: str, tool_name: str, tool_call_id: str = "", detail: str = "") -> str:
    payload = {
        "type": "tool",
        "event": event,
        "tool": tool_name,
    }
    if tool_call_id:
        payload["call_id"] = tool_call_id
    if detail:
        payload["detail"] = detail
    return f"[TOOL_EVENT:{json.dumps(payload, ensure_ascii=False, separators=(',', ':'))}]"


def _is_tool_error(tool_output: str) -> bool:
    lowered_output = (tool_output or "").lower()
    error_signals = ("error", "exception", "traceback", "失败", "错误")
    return any(signal in lowered_output for signal in error_signals)

def _build_messages(user_input: str, history: list = None):
    messages = [SystemMessage(content=SYSTEM_PROMPT)]
    if history:
        # 滑动窗口记忆管理：只保留最近 6 条消息（3轮对话），避免 Token 超限
        window_history = history[-6:]
        for msg in window_history:
            if msg['role'] == 'user':
                messages.append(HumanMessage(content=msg['content']))
            elif msg['role'] == 'assistant':
                messages.append(AIMessage(content=_strip_control_tokens(msg['content'])))
                
    messages.append(HumanMessage(content=user_input))
    return messages

def chat_with_agent(user_input: str, history: list = None):
    """
    供外部 API 调用的便捷函数
    history: 格式为 [{'role': 'user', 'content': '...'}, {'role': 'assistant', 'content': '...'}]
    """
    messages = _build_messages(user_input, history)
    
    # 运行工作流
    result = app.invoke({"messages": messages})
    # 获取最后一条消息的内容
    return result["messages"][-1].content

async def astream_chat_with_agent(user_input: str, history: list = None):
    """
    供外部 API 调用的流式异步便捷函数
    """
    messages = _build_messages(user_input, history)
    streamed_reply = ""
    emitted_completed_messages: set[str] = set()
    emitted_tool_calls: set[str] = set()
    tool_name_by_call_id: dict[str, str] = {}

    def _extract_text(payload: Any) -> str:
        """兼容 LangChain 不同事件结构，尽量提取最终可展示文本。"""
        if payload is None:
            return ""
        if isinstance(payload, str):
            return payload
        if hasattr(payload, "content"):
            return _extract_text(payload.content)
        if isinstance(payload, list):
            parts = []
            for item in payload:
                if isinstance(item, dict) and item.get("type") == "text":
                    text = item.get("text", "")
                    if text:
                        parts.append(text)
                else:
                    text = _extract_text(item)
                    if text:
                        parts.append(text)
            return "".join(parts)
        if isinstance(payload, dict):
            for key in ("content", "output", "message", "text", "messages", "generations"):
                if key in payload:
                    text = _extract_text(payload[key])
                    if text:
                        return text
        return ""

    def _yield_remaining_text(final_text: str) -> str:
        nonlocal streamed_reply
        if not final_text or final_text in emitted_completed_messages:
            return ""

        if streamed_reply and final_text.startswith(streamed_reply):
            remaining_text = final_text[len(streamed_reply):]
        elif streamed_reply == final_text:
            remaining_text = ""
        else:
            remaining_text = final_text

        streamed_reply = final_text
        emitted_completed_messages.add(final_text)
        return remaining_text

    async for chunk in app.astream(
        {"messages": messages},
        stream_mode=["messages", "updates"],
        version="v2",
    ):
        chunk_type = chunk.get("type")

        if chunk_type == "messages":
            token, metadata = chunk["data"]
            if metadata.get("langgraph_node") == "tools":
                continue

            text = _extract_text(token)
            if text:
                streamed_reply += text
                yield text

        elif chunk_type == "updates":
            for source, update in chunk["data"].items():
                update_messages = update.get("messages", [])
                if not update_messages:
                    continue

                for current_message in update_messages:
                    if source == "agent" and isinstance(current_message, AIMessage):
                        for tool_call in current_message.tool_calls:
                            tool_name = tool_call.get("name", "")
                            tool_call_id = tool_call.get("id", "")
                            if tool_call_id:
                                tool_name_by_call_id[tool_call_id] = tool_name

                            tool_key = tool_call_id or f"{tool_name}:{json.dumps(tool_call.get('args', {}), sort_keys=True, ensure_ascii=False)}"
                            if tool_name and tool_key not in emitted_tool_calls:
                                emitted_tool_calls.add(tool_key)
                                yield _build_tool_event("start", tool_name, tool_call_id)

                        final_text = _extract_text(current_message.content)
                        if final_text and not current_message.tool_calls:
                            remaining_text = _yield_remaining_text(final_text)
                            if remaining_text:
                                yield remaining_text

                    elif source == "tools" and isinstance(current_message, ToolMessage):
                        tool_name = tool_name_by_call_id.get(current_message.tool_call_id, "")
                        tool_output = _extract_text(current_message.content)
                        if tool_name:
                            tool_event = "error" if _is_tool_error(tool_output) else "complete"
                            yield _build_tool_event(tool_event, tool_name, current_message.tool_call_id)

                        if tool_name == "transfer_to_human" and "[HUMAN_HANDOFF_TRIGGERED]" in tool_output:
                            yield "[HUMAN_HANDOFF_TRIGGERED]"
                        elif tool_name == "get_recent_orders":
                            try:
                                parsed_data = json.loads(tool_output or "{}")
                                actual_data = parsed_data.get("data", [])
                                yield f"[ORDER_SELECTOR_TRIGGERED:{json.dumps(actual_data, ensure_ascii=False)}]"
                            except Exception:
                                yield "[ORDER_SELECTOR_TRIGGERED:[]]"

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
