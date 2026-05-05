# Ecommerce AI CS (电商售后智能客服系统)

## 项目简介
**Ecommerce AI CS** 是一个专为电子商务售后场景打造的智能客服系统。该项目结合了大型语言模型（LLM）和检索增强生成（RAG）技术，利用 LangGraph 框架构建智能体（Agent），能够自动化、智能化地解答用户的售后咨询，处理诸如退换货政策查询、订单状态跟踪等电商客服场景中常见的需求。

## 功能特性
- **🤖 智能问答**：基于大语言模型的智能对话，上下文感知，能够理解复杂的售后诉求。
- **📚 知识库检索（RAG）**：自动检索内部售后政策与条款（如 `policy.md`），保证回答的准确性与合规性。
- **⚡ 高性能 API**：后端采用 FastAPI 构建，提供异步、快速且具备自动文档化（Swagger UI）的 RESTful API。
- **🎨 现代化界面**：前端采用 React + Tailwind CSS，交互流畅，响应式设计，带来良好的用户体验。
- **🛠 易于扩展**：通过 LangGraph 构建的工作流机制，可以轻松引入新的工具和逻辑分支。

## 技术栈

### 后端 (Backend)
- **核心框架**：[FastAPI](https://fastapi.tiangolo.com/) (Web 框架), [Uvicorn](https://www.uvicorn.org/) (ASGI 服务器)
- **AI 与智能体**：[LangChain](https://python.langchain.com/), [LangGraph](https://python.langchain.com/docs/langgraph), [LangChain-OpenAI](https://github.com/langchain-ai/langchain)
- **向量检索与 RAG**：[ChromaDB](https://www.trychroma.com/), [Sentence-Transformers](https://sbert.net/)
- **数据库**：[SQLAlchemy](https://www.sqlalchemy.org/) (ORM), [PyMySQL](https://pymysql.readthedocs.io/), SQLite (开发默认)
- **环境管理**：[Conda](https://docs.conda.io/en/latest/)

### 前端 (Frontend)
- **核心框架**：[React](https://react.dev/) (v19), [Vite](https://vitejs.dev/)
- **UI & 样式**：[Tailwind CSS](https://tailwindcss.com/) (v4), [Lucide React](https://lucide.dev/) (图标)
- **HTTP 客户端**：[Axios](https://axios-http.com/)
- **Markdown 渲染**：[React Markdown](https://github.com/remarkjs/react-markdown)

---

## 项目结构
```text
ecommerce-ai-cs/
├── backend/                  # 后端服务
│   ├── agent/                # 智能体核心逻辑 (LangGraph, Tools)
│   ├── data/                 # 知识库数据源 (如 policy.md)
│   ├── database/             # 数据库模型与初始化
│   ├── environment.yml       # Conda 依赖配置文件
│   ├── main.py               # FastAPI 主入口
│   └── .env                  # 后端环境变量 (需手动创建)
├── frontend/                 # 前端服务
│   ├── public/               # 静态资源
│   ├── src/                  # 源代码 (组件, 样式, 页面)
│   ├── package.json          # npm 依赖配置
│   └── vite.config.js        # Vite 构建配置
└── README.md                 # 项目说明文档
```

---

## 安装部署指南

### 前提条件
- 已安装 **Miniconda** 或 **Anaconda** (用于后端环境管理)
- 已安装 **Node.js** (v18+，推荐使用最新的 LTS 版本) 和 npm
- 拥有 OpenAI API Key 或其他兼容的 LLM 服务密钥

### 1. 后端部署 (Backend)

进入后端目录并使用 conda 创建隔离环境：
```bash
cd backend

# 使用 environment.yml 创建 conda 环境
conda env create -f environment.yml

# 激活虚拟环境
conda activate ecommerce-ai-cs

# 配置环境变量
cp .env.example .env  # 如果没有示例文件，请直接创建 .env 文件
```

在 `.env` 文件中补充必要的环境变量，例如：
```env
OPENAI_API_KEY=your_openai_api_key_here
```

启动后端服务：
```bash
python main.py
# 或使用 uvicorn 直接启动:
# uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
服务将在 `http://localhost:8000` 启动。

### 2. 前端部署 (Frontend)

进入前端目录并安装依赖：
```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```
服务默认将在 `http://localhost:5173` 启动（具体端口请查看终端输出）。

---

## API 文档

后端成功启动后，FastAPI 会自动生成交互式 API 文档。您可以通过浏览器访问：
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### 主要接口说明

#### 1. 聊天接口
- **URL**: `/api/chat`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "message": "用户输入的咨询内容",
    "history": [
      {"role": "user", "content": "历史消息"},
      {"role": "assistant", "content": "历史回复"}
    ]
  }
  ```
- **Response**:
  ```json
  {
    "reply": "智能客服的回复内容"
  }
  ```

#### 2. 健康检查
- **URL**: `/api/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "ok",
    "message": "服务运行正常"
  }
  ```

---
