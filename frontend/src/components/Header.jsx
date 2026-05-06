import React from 'react';
import { Headphones, ShieldCheck, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
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
  );
}
