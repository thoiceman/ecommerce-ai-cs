import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Package, ChevronRight } from 'lucide-react';

export default function ChatBox({ messages, isLoading, onSendMessage }) {
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
        
        let content = msg.content;
        let orderData = null;
        
        // 解析特殊的订单选择触发器
        const match = content.match(/\[ORDER_SELECTOR_TRIGGERED:(\[[\s\S]*?\])\]/);
        if (match) {
          try {
            orderData = JSON.parse(match[1]);
            content = content.replace(match[0], '');
          } catch (e) {
            console.error("解析订单数据失败", e);
          }
        }
        
        return (
          <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* 头像 */}
              <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-600 ml-3' : 'bg-emerald-500 mr-3 mt-1'}`}>
                {isUser ? <User className="text-white w-5 h-5" /> : <Bot className="text-white w-5 h-5" />}
              </div>
              
              {/* 消息内容区 */}
              <div className="flex flex-col space-y-2">
                {content.trim() && (
                  <div className={`px-5 py-3 rounded-2xl shadow-sm prose prose-sm max-w-none break-words ${
                    isUser 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                  }`}>
                    <ReactMarkdown>
                      {content}
                    </ReactMarkdown>
                  </div>
                )}
                
                {/* 订单选择卡片 */}
                {orderData && Array.isArray(orderData) && orderData.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mt-2">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700 flex items-center">
                      <Package className="w-4 h-4 mr-2" />
                      请选择您要咨询的订单
                    </div>
                    <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                      {orderData.map((order, idx) => (
                        <button 
                          key={idx}
                          onClick={() => onSendMessage && onSendMessage(`我要咨询订单：${order.order_no}`)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">{order.product_name}</div>
                            <div className="text-xs text-gray-500 mt-1 flex space-x-3">
                              <span>订单号: {order.order_no}</span>
                              <span className="text-emerald-600">{order.status}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
