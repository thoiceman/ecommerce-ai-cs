import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import sys
import os
from langchain_core.messages import AIMessage, AIMessageChunk, ToolMessage, HumanMessage

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from agent.graph import chat_with_agent, astream_chat_with_agent, call_model

@pytest.mark.asyncio
async def test_sliding_window_memory():
    """测试传递长历史记录时，大模型调用是否只会截取最后 6 条"""
    
    # 模拟长对话（10条历史消息）
    long_history = [{"role": "user", "content": f"消息 {i}"} for i in range(10)]
    
    with patch("agent.graph.app.invoke") as mock_invoke:
        mock_invoke.return_value = {"messages": [MagicMock(content="测试回复")]}
        
        chat_with_agent("新消息", history=long_history)
        
        # 检查传入大模型的 messages 长度
        # 1 条 SystemMessage + 6 条截断的 History + 1 条新 HumanMessage = 8
        called_messages = mock_invoke.call_args[0][0]["messages"]
        assert len(called_messages) == 8
        # 验证最后一条是不是新消息
        assert called_messages[-1].content == "新消息"
        # 验证历史记录是否被截断到只有最后的 6 条
        assert called_messages[1].content == "消息 4"
        assert called_messages[-2].content == "消息 9"


@pytest.mark.asyncio
async def test_call_model_passes_config_for_async_streaming():
    """Python 3.10 下需要显式透传 config，确保 LangGraph 的流式上下文不丢失。"""

    state = {"messages": [HumanMessage(content="测试问题")]}
    config = {"tags": ["stream-test"]}

    with patch("agent.graph.llm_with_tools.ainvoke", new_callable=AsyncMock) as mock_ainvoke:
        mock_ainvoke.return_value = AIMessage(content="测试回复")

        await call_model(state, config)

        assert mock_ainvoke.await_count == 1
        called_args = mock_ainvoke.await_args
        assert called_args.kwargs["config"] == config

@pytest.mark.asyncio
async def test_human_handoff_trigger():
    """测试情绪激动时触发人工转接逻辑"""

    async def mock_stream(*_args, **_kwargs):
        yield {
            "type": "updates",
            "data": {
                "agent": {
                    "messages": [
                        AIMessage(
                            content="",
                            tool_calls=[
                                {
                                    "name": "transfer_to_human",
                                    "args": {"reason": "用户投诉"},
                                    "id": "call_handoff",
                                    "type": "tool_call",
                                }
                            ],
                        )
                    ]
                }
            },
        }
        yield {
            "type": "updates",
            "data": {
                "tools": {
                    "messages": [
                        ToolMessage(
                            content="[HUMAN_HANDOFF_TRIGGERED]",
                            tool_call_id="call_handoff",
                        )
                    ]
                }
            },
        }

    with patch("agent.graph.app.astream", new=mock_stream):
        responses = []
        async for chunk in astream_chat_with_agent("你们太垃圾了，我要投诉！"):
            responses.append(chunk)

        assert any('"event":"start"' in chunk and '"tool":"transfer_to_human"' in chunk for chunk in responses)
        assert any('"event":"complete"' in chunk and '"tool":"transfer_to_human"' in chunk for chunk in responses)
        assert "[HUMAN_HANDOFF_TRIGGERED]" in responses


@pytest.mark.asyncio
async def test_streaming_reply_tokens():
    """测试正常回复时优先输出流式 token，而不是等完整结果一次性返回"""

    async def mock_stream(*_args, **_kwargs):
        yield {
            "type": "messages",
            "data": (
                AIMessageChunk(content=[{"type": "text", "text": "退换货"}]),
                {"langgraph_node": "agent"},
            ),
        }
        yield {
            "type": "messages",
            "data": (
                AIMessageChunk(content=[{"type": "text", "text": "期限为7天。"}]),
                {"langgraph_node": "agent"},
            ),
        }
        yield {
            "type": "updates",
            "data": {
                "agent": {
                    "messages": [
                        AIMessage(content="退换货期限为7天。")
                    ]
                }
            },
        }

    with patch("agent.graph.app.astream", new=mock_stream):
        responses = []
        async for chunk in astream_chat_with_agent("退换货期限是多久？"):
            responses.append(chunk)

        assert responses == ["退换货", "期限为7天。"]


@pytest.mark.asyncio
async def test_multiple_tool_messages_all_emit_completion_events():
    """同一轮 tools 更新里有多个 ToolMessage 时，所有工具都应发出完成事件。"""

    async def mock_stream(*_args, **_kwargs):
        yield {
            "type": "updates",
            "data": {
                "agent": {
                    "messages": [
                        AIMessage(
                            content="",
                            tool_calls=[
                                {
                                    "name": "get_order_status",
                                    "args": {"order_no": "ORD20250505001"},
                                    "id": "call_status",
                                    "type": "tool_call",
                                },
                                {
                                    "name": "request_return",
                                    "args": {"order_no": "ORD20250505001", "reason": "不喜欢"},
                                    "id": "call_return",
                                    "type": "tool_call",
                                },
                            ],
                        )
                    ]
                }
            },
        }
        yield {
            "type": "updates",
            "data": {
                "tools": {
                    "messages": [
                        ToolMessage(
                            content='{"status":"success","order_status":"退货中"}',
                            tool_call_id="call_status",
                        ),
                        ToolMessage(
                            content='{"status":"success","message":"退货申请已提交"}',
                            tool_call_id="call_return",
                        ),
                    ]
                }
            },
        }

    with patch("agent.graph.app.astream", new=mock_stream):
        responses = []
        async for chunk in astream_chat_with_agent("我想把订单 ORD20250505001 退货，商品不喜欢"):
            responses.append(chunk)

        assert any('"event":"complete"' in chunk and '"tool":"get_order_status"' in chunk for chunk in responses)
        assert any('"event":"complete"' in chunk and '"tool":"request_return"' in chunk for chunk in responses)
