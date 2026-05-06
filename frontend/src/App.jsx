import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ChatBox from './components/ChatBox';
import InputArea from './components/InputArea';
import { Headphones, ShieldCheck, MessageSquare, PlusCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('AI_AGENT');
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: '您好！我是电商售后智能助手，请问有什么可以帮您？\n\n您可以问我：\n- **退换货政策**（例如：退换货期限是多久？运费谁出？）\n- **订单查询**（例如：帮我查一下订单号 `ORD20250505001` 的状态）\n- **退货申请**（例如：我想把订单 `ORD20250505001` 退货，商品不喜欢）' 
    }
  ]);
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
      // 过滤掉前端初始的占位提示
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
          buffer = lines.pop(); // 最后一部分可能不完整，留到下一次处理

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
      loadSessions(); // 刷新侧边栏
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* 侧边栏 (历史会话) */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col z-20 hidden md:flex">
        <div className="p-4 border-b border-gray-200">
          <button 
            onClick={createNewSession}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
            <span>新会话</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => selectSession(s.id)}
              className={`w-full flex items-center space-x-2 px-3 py-3 rounded-lg text-left transition-colors ${currentSessionId === s.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">
                {s.created_at.substring(0, 16).replace('T', ' ')}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        {/* 顶部 Header */}
        <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center z-10">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Headphones className="text-blue-600 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800 tracking-tight">电商售后智能客服</h1>
              <p className="text-xs text-gray-500">RAG + Multi-Agent 架构演示</p>
            </div>
          </div>
          <div className="flex items-center text-emerald-600 text-sm font-medium space-x-4">
            <div className="flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4" />
              <span>AI 实时在线</span>
            </div>
            <Link to="/admin" className="text-gray-500 hover:text-gray-700 transition-colors">
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </header>

        {/* 主聊天区域 */}
        <div className="flex-1 overflow-hidden py-6 px-4">
          <main className="h-full flex flex-col max-w-4xl mx-auto w-full bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-200">
            {sessionStatus === 'HUMAN_AGENT' && (
              <div className="bg-yellow-100 text-yellow-800 text-center py-2 text-sm font-medium flex items-center justify-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2"></span>
                人工客服接待中
              </div>
            )}
            <ChatBox messages={messages} isLoading={isLoading} />
            <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} />
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
