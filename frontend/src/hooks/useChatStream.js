import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const initialMessage = { 
  role: 'assistant', 
  content: '您好！我是电商售后智能助手，请问有什么可以帮您？\n\n您可以问我：\n- **退换货政策**（例如：退换货期限是多久？运费谁出？）\n- **订单查询**（例如：帮我查一下订单号 `ORD20250505001` 的状态）\n- **退货申请**（例如：我想把订单 `ORD20250505001` 退货，商品不喜欢）' 
};

export function useChatStream() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('AI_AGENT');
  const [messages, setMessages] = useState([initialMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const isInitialMount = useRef(true);

  const loadSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/sessions`);
      setSessions(res.data);
    } catch (e) {
      console.error("无法加载会话列表", e);
    }
  };

  const selectSession = async (sessionId) => {
    setCurrentSessionId(sessionId);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/sessions/${sessionId}/messages`);
      if (res.data.length > 0) {
        setMessages(res.data);
      } else {
        setMessages([]);
      }
      const sessionRes = sessions.find(s => s.id === sessionId);
      if (sessionRes) {
        setSessionStatus(sessionRes.status);
      }
    } catch (e) {
      console.error("加载会话消息失败", e);
    }
  };

  const createNewSession = () => {
    setCurrentSessionId(null);
    setSessionStatus('AI_AGENT');
    setMessages([
      { 
        role: 'assistant', 
        content: '您好！我是电商售后智能助手，请问有什么可以帮您？' 
      }
    ]);
  };

  useEffect(() => {
    if (isInitialMount.current) {
      loadSessions();
      isInitialMount.current = false;
    }
  }, []);

  const handleSendMessage = async (text) => {
    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const history = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));
      
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: currentSessionId,
          history: history
        })
      });

      if (!response.ok) throw new Error("网络响应不正确");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let assistantMessage = { role: 'assistant', content: '' };
      let newSessionIdSet = false;
      let firstChunkReceived = false;
      
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          if (!firstChunkReceived) {
            setIsLoading(false);
            firstChunkReceived = true;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.substring(6);
              if (dataStr.trim() === '[DONE]') {
                done = true;
                break;
              }
              try {
                const data = JSON.parse(dataStr);
                if (data.session_id && !currentSessionId && !newSessionIdSet) {
                   setCurrentSessionId(data.session_id);
                   newSessionIdSet = true;
                   loadSessions();
                }
                if (data.status) {
                  setSessionStatus(data.status);
                }
                if (data.chunk) {
                  assistantMessage.content += data.chunk;
                  setMessages([...newMessages, { ...assistantMessage }]);
                }
              } catch (e) {
                console.error("解析 JSON 错误", e, dataStr);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("API 请求失败:", error);
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: '抱歉，系统连接后端失败，请确保后端服务正常运行。' 
      }]);
    } finally {
      setIsLoading(false);
      loadSessions();
    }
  };

  return {
    sessions,
    currentSessionId,
    sessionStatus,
    messages,
    isLoading,
    createNewSession,
    selectSession,
    handleSendMessage
  };
}
