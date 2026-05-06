import { useState } from 'react';
import { Send, LoaderCircle, Waves } from 'lucide-react';

export default function InputArea({ onSendMessage, isLoading, streamPhase }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            streamPhase === 'waiting'
              ? '客服助手正在准备回复...'
              : streamPhase === 'streaming'
                ? '客服助手正在流式回复中...'
                : '输入您的问题，例如：退货运费谁出？ 或 查一下订单 ORD20250505001'
          }
          disabled={isLoading}
          className="flex-1 border border-gray-300 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-blue-600 text-white rounded-full p-3 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <Send className="w-5 h-5" />
        </button>
        </div>
        <div className="mt-2 min-h-5 px-2 text-xs text-gray-500">
          {streamPhase === 'waiting' && (
            <span className="inline-flex items-center gap-2 text-amber-600">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              正在等待首个响应，建立流式连接中
            </span>
          )}
          {streamPhase === 'streaming' && (
            <span className="inline-flex items-center gap-2 text-emerald-600">
              <Waves className="h-3.5 w-3.5" />
              正在流式回复，内容会持续追加显示
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
