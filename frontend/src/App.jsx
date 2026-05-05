import React, { useState } from 'react';
import axios from 'axios';
import ChatBox from './components/ChatBox';
import InputArea from './components/InputArea';
import { Headphones, ShieldCheck } from 'lucide-react';

function App() {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: '您好！我是电商售后智能助手，请问有什么可以帮您？\n\n您可以问我：\n- **退换货政策**（例如：退换货期限是多久？运费谁出？）\n- **订单查询**（例如：帮我查一下订单号 `ORD20250505001` 的状态）\n- **退货申请**（例如：我想把订单 `ORD20250505001` 退货，商品不喜欢）' 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (text) => {
    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // 过滤掉前端初始的占位提示（如果不希望带入后端历史的话，这里我们全部带入也无妨）
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await axios.post(`${API_BASE_URL}/api/chat`, {
        message: text,
        history: history
      });

      setMessages([...newMessages, { role: 'assistant', content: response.data.reply }]);
    } catch (error) {
      console.error("API 请求失败:", error);
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: '抱歉，系统连接后端失败，请确保 FastAPI 后端 (端口 8000) 已经启动。' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
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
        <div className="flex items-center text-emerald-600 text-sm font-medium space-x-1">
          <ShieldCheck className="w-4 h-4" />
          <span>AI 实时在线</span>
        </div>
      </header>

      {/* 主聊天区域 (居中对齐，模拟手机/对话框样式) */}
      <div className="flex-1 overflow-hidden py-6 px-4">
        <main className="h-full flex flex-col max-w-4xl mx-auto w-full bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-200">
          <ChatBox messages={messages} isLoading={isLoading} />
          <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} />
        </main>
      </div>
    </div>
  );
}

export default App;
