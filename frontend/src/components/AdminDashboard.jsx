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
    <div className="flex h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* 侧边栏 */}
      <div className="w-72 bg-white border-r border-slate-200/60 flex flex-col z-20">
        <div className="p-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-200">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">AI CS Admin</h2>
          <p className="text-sm text-slate-500 mt-2 font-medium">智能客服运营中心</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <a href="#" className="flex items-center space-x-3 px-4 py-3.5 bg-indigo-50/80 text-indigo-700 rounded-2xl font-semibold border border-indigo-100/50 transition-all">
            <BarChart3 className="w-5 h-5" />
            <span>数据总览</span>
          </a>
          <Link to="/" className="flex items-center space-x-3 px-4 py-3.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-2xl font-medium transition-all group">
            <MessageSquare className="w-5 h-5 text-slate-400 group-hover:text-slate-700 transition-colors" />
            <span>返回客服前台</span>
          </Link>
        </nav>
        
        <div className="p-6 border-t border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">AD</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Admin User</p>
              <p className="text-xs text-slate-500 font-medium">System Manager</p>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto p-10 lg:p-12">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">运营数据分析</h1>
            <p className="text-slate-500 mt-2 font-medium">实时监控智能客服的运行状态与接管效率</p>
          </div>
          
          {/* 数据卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="relative">
                <div className="p-3 bg-indigo-100/50 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-sm text-slate-500 font-semibold mb-1">总会话数</p>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{stats?.total_sessions || 0}</p>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="relative">
                <div className="p-3 bg-amber-100/50 w-12 h-12 rounded-2xl flex items-center justify-center text-amber-600 mb-6">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-sm text-slate-500 font-semibold mb-1">转人工会话</p>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{stats?.human_sessions || 0}</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="relative">
                <div className="p-3 bg-emerald-100/50 w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <p className="text-sm text-slate-500 font-semibold mb-1">AI 独立解决率</p>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{stats?.ai_resolve_rate || 0}<span className="text-2xl text-slate-400 ml-1">%</span></p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="relative">
                <div className="p-3 bg-purple-100/50 w-12 h-12 rounded-2xl flex items-center justify-center text-purple-600 mb-6">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-sm text-slate-500 font-semibold mb-1">总消息数</p>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{stats?.total_messages || 0}</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200/60">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">知识库引擎</h1>
            <p className="text-slate-500 mt-2 font-medium">管理 AI 检索所依赖的业务政策与领域知识</p>
          </div>
          
          {/* 知识库上传 */}
          <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-sm border border-slate-200/60 relative overflow-hidden">
            {/* 装饰性背景 */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
            
            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-slate-100 rounded-2xl text-slate-700">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">导入政策条款</h2>
                    <p className="text-sm text-slate-500 mt-1">支持 Markdown 或纯文本文件</p>
                  </div>
                </div>
                <div>
                  <label className="cursor-pointer inline-flex items-center justify-center px-5 py-2.5 bg-white border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-xl transition-all text-sm font-bold shadow-sm group">
                    <Upload className="w-4 h-4 mr-2 text-slate-400 group-hover:text-indigo-500 transition-colors" />
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
              
              {kbContent ? (
                <div className="mt-6 p-6 bg-slate-50/80 border border-slate-200/80 rounded-2xl max-h-72 overflow-y-auto text-sm text-slate-700 font-mono leading-relaxed shadow-inner">
                  {kbContent}
                </div>
              ) : (
                <div className="mt-6 h-48 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                  <BookOpen className="w-10 h-10 mb-3 opacity-20" />
                  <p className="font-medium text-sm">尚未选择文件</p>
                  <p className="text-xs mt-1 opacity-60">选择文件后将在此预览内容</p>
                </div>
              )}
              
              <div className="mt-8 flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-sm font-medium text-slate-600 flex items-center">
                  {uploadStatus && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
                      {uploadStatus}
                    </>
                  )}
                </span>
                <button
                  onClick={handleUploadKB}
                  disabled={!kbContent.trim()}
                  className="flex items-center justify-center space-x-2 bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed transition-all font-bold"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>向量化并入库</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}