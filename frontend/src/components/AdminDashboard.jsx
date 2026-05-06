import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, BookOpen, Upload, Users, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [kbContent, setKbContent] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [fileName, setFileName] = useState('admin_dashboard_upload.md');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/stats`);
      setStats(res.data);
    } catch (e) {
      console.error("加载统计数据失败", e);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setKbContent(event.target.result);
      setUploadStatus(`已读取文件：${file.name}`);
    };
    reader.onerror = () => {
      setUploadStatus('读取文件失败');
    };
    reader.readAsText(file);
  };

  const handleUploadKB = async () => {
    if (!kbContent.trim()) return;
    setUploadStatus('正在上传...');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/admin/kb`, {
        content: kbContent,
        source: fileName
      });
      setUploadStatus(res.data.message);
      setKbContent('');
      setFileName('admin_dashboard_upload.md');
    } catch (e) {
      console.error("上传知识库失败", e);
      setUploadStatus('上传失败，请重试');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* 侧边栏 */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col z-20 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">电商智能后台</h2>
          <p className="text-xs text-gray-500 mt-1">管理与数据分析</p>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <a href="#" className="flex items-center space-x-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-medium">
            <BarChart3 className="w-5 h-5" />
            <span>数据总览</span>
          </a>
          <Link to="/" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <MessageSquare className="w-5 h-5" />
            <span>返回客服前台</span>
          </Link>
        </nav>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <h1 className="text-2xl font-bold text-gray-800">系统运营数据</h1>
          
          {/* 数据卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">总会话数</p>
                <p className="text-2xl font-bold text-gray-800">{stats?.total_sessions || 0}</p>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-yellow-100 rounded-full text-yellow-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">转人工会话</p>
                <p className="text-2xl font-bold text-gray-800">{stats?.human_sessions || 0}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">AI 独立解决率</p>
                <p className="text-2xl font-bold text-gray-800">{stats?.ai_resolve_rate || 0}%</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">总消息数</p>
                <p className="text-2xl font-bold text-gray-800">{stats?.total_messages || 0}</p>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 pt-6">知识库管理</h1>
          
          {/* 知识库上传 */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <BookOpen className="text-gray-600 w-6 h-6" />
                <h2 className="text-lg font-semibold text-gray-800">上传新的政策条款 (Markdown/纯文本)</h2>
              </div>
              <div>
                <label className="cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                  选择本地文件
                  <input 
                    type="file" 
                    accept=".txt,.md" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                </label>
              </div>
            </div>
            <textarea
              className="w-full h-48 border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="在此粘贴最新的售后政策、运费规则等文本，提交后将自动分块并向量化存入 ChromaDB，供 AI 检索使用..."
              value={kbContent}
              onChange={(e) => setKbContent(e.target.value)}
            ></textarea>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">{uploadStatus}</span>
              <button
                onClick={handleUploadKB}
                disabled={!kbContent.trim()}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>向量化并入库</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}