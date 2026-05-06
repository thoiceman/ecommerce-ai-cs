from langchain_core.tools import tool

@tool
def transfer_to_human(reason: str) -> str:
    """
    当用户明确要求转人工，或者表达强烈不满、情绪激动、投诉等负面情绪时，调用此工具转接人工客服。
    
    Args:
        reason: 转接人工的原因（如"用户投诉"、"情绪激动"、"多次未能解决"等）
    """
    return "[HUMAN_HANDOFF_TRIGGERED]"
