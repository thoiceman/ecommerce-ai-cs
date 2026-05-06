import React from 'react';
import { PlusCircle, MessageSquare } from 'lucide-react';

export default function Sidebar({ sessions, currentSessionId, createNewSession, selectSession }) {
  return (
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
  );
}
