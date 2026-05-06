import pytest
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from agent.rag_tool import query_policy, rewrite_query

def test_query_rewriting_logic():
    """测试 Query Rewriting 逻辑是否正常调用"""
    # mock LLM 的返回
    with patch("agent.rag_tool.ChatOpenAI.invoke") as mock_invoke:
        mock_invoke.return_value = MagicMock(content="退货条件与流程")
        
        result = rewrite_query("我昨天买的衣服不喜欢，能退吗？")
        
        assert result == "退货条件与流程"
        mock_invoke.assert_called_once()

def test_query_policy():
    """测试 query_policy 的完整链路（从重写到向量检索）"""
    with patch("agent.rag_tool.rewrite_query", return_value="标准退货词") as mock_rewrite:
        with patch("agent.rag_tool.get_vector_store") as mock_get_store:
            # 模拟向量库检索返回
            mock_store = MagicMock()
            mock_doc1 = MagicMock(page_content="条款1：7天无理由退货。")
            mock_doc2 = MagicMock(page_content="条款2：退货运费自理。")
            mock_store.similarity_search.return_value = [mock_doc1, mock_doc2]
            
            mock_get_store.return_value = mock_store
            
            result = query_policy("我想退货")
            
            # 验证流程是否正确调用
            mock_rewrite.assert_called_once_with("我想退货")
            mock_store.similarity_search.assert_called_once_with("标准退货词", k=3)
            
            # 验证返回内容是否拼装正确
            assert "7天无理由退货" in result
            assert "退货运费自理" in result
