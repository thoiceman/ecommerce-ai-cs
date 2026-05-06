import React from 'react';
import ChatBox from './components/ChatBox';
import InputArea from './components/InputArea';
import { Headphones, ShieldCheck, MessageSquare, PlusCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useChatStream } from './hooks/useChatStream';

function App() {
  const {
    sessions,
    currentSessionId,
    sessionStatus,
    messages,
    isLoading,
    createNewSession,
    selectSession,
    handleSendMessage
  } = useChatStream();

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
                {s.title || s.created_at.substring(0, 16).replace('T', ' ')}
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
              <p className="text-xs text-gray-500">RAG + 智能售后 Agent 演示</p>
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
            <ChatBox messages={messages} isLoading={isLoading} onSendMessage={handleSendMessage} />
            <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} />
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
