import pytest
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from agent.graph import chat_with_agent, astream_chat_with_agent

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
async def test_human_handoff_trigger():
    """测试情绪激动时触发人工转接逻辑"""
    
    # 这里只是测试逻辑层，并不真实请求大模型，
    # 我们可以 mock astream_events 返回 on_tool_end
    
    async def mock_events(*args, **kwargs):
        yield {"event": "on_tool_start", "name": "transfer_to_human", "data": {}}
        yield {"event": "on_tool_end", "name": "transfer_to_human", "data": {}}
        
    with patch("agent.graph.app.astream_events", new=mock_events):
        responses = []
        async for chunk in astream_chat_with_agent("你们太垃圾了，我要投诉！"):
            responses.append(chunk)
            
        # 检查是否输出了人工转接的标识
        assert "[HUMAN_HANDOFF_TRIGGERED]" in responses
