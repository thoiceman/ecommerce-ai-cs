import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User } from 'lucide-react';

export default function ChatBox({ messages, isLoading }) {
  const messagesEndRef = useRef(null);

  // 每次消息更新后自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
      {messages.map((msg, index) => {
        // 忽略系统提示消息（如果有的话）
        if (msg.role === 'system') return null;
        
        const isUser = msg.role === 'user';
        
        return (
          <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* 头像 */}
              <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-600 ml-3' : 'bg-emerald-500 mr-3'}`}>
                {isUser ? <User className="text-white w-5 h-5" /> : <Bot className="text-white w-5 h-5" />}
              </div>
              
              {/* 消息气泡 */}
              <div className={`px-5 py-3 rounded-2xl shadow-sm prose prose-sm max-w-none break-words ${
                isUser 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
              }`}>
                <ReactMarkdown>
                  {msg.content}
                </ReactMarkdown>
              </div>
              
            </div>
          </div>
        );
      })}
      
      {/* 加载动画 (打字机效果) */}
      {isLoading && (
        <div className="flex justify-start">
          <div className="flex max-w-[85%] flex-row">
            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-emerald-500 mr-3 flex items-center justify-center">
              <Bot className="text-white w-5 h-5" />
            </div>
            <div className="px-5 py-4 rounded-2xl bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
