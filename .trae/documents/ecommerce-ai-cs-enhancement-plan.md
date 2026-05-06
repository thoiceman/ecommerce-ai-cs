# 智能客服系统功能升级计划 (AI Customer Service Enhancement Plan)

## 1. 摘要 (Summary)

本项目旨在基于现有的电商售后智能客服系统（FastAPI + LangGraph + React），根据您的需求，在三个核心方向上进行功能扩展：**用户体验提升**（流式输出、会话历史持久化）、**转人工机制**（情绪监控与无缝转接人工客服）、以及**后台管理与数据看板**（知识库管理与运营数据统计）。

## 2. 现状分析 (Current State Analysis)

* **后端架构**：FastAPI 提供阻塞式的 `/api/chat` 接口，LangGraph 负责智能体编排，默认使用 `qwen-max`，仅支持纯文本。

* **数据库**：使用 SQLite，包含 `User`, `Product`, `Order` 表，**缺乏聊天会话历史的持久化存储**。

* **前端架构**：React + Vite + Tailwind，只有一个简单的单页面聊天框，缺乏多页面路由、后台管理面板。

## 3. 具体改进方案 (Proposed Changes)

本计划建议分三个阶段（Phases）逐步实施：

### Phase 1: 用户体验提升 (基础架构升级)

*目标：实现类似 ChatGPT 的流式打字效果，并支持多会话记录。*

* **`backend/database/models.py`**

  * **What & Why**: 新增 `ChatSession` (会话表) 和 `ChatMessage` (消息表) 以实现会话历史的持久化。

* **`backend/agent/graph.py`**

  * **What & How**: 将 `chat_with_agent` 改写为异步生成器，利用 LangGraph 的 `.astream_events()` 接口向外吐出 token，实现流式输出。

* **`backend/main.py`**

  * **What & How**: 修改 `/api/chat` 接口，返回 `StreamingResponse` (基于 Server-Sent Events, SSE)；新增 `/api/sessions` 接口用于获取历史会话列表。

* **`frontend/src/components/ChatBox.jsx`** **&** **`App.jsx`**

  * **What & How**: 将现有的 Axios 请求重构为使用 Fetch API 解析 SSE 数据流，渲染打字机效果。左侧增加一个侧边栏用于显示和切换历史会话。

### Phase 2: 智能情绪监控与转人工机制

*目标：在遇到复杂问题、用户反复提问或情绪激动时，无缝切换到人工客服状态。*

* **`backend/agent/graph.py`**

  * **What & How**: 修改 Prompt 逻辑和图结构；新增一个判断逻辑（可以通过特定的 Tool 或状态分类节点实现），如果检测到用户强烈要求转人工或表达出负面情绪，Agent 将返回特定指令并更新 `ChatSession` 的状态为 `HUMAN_AGENT`。

* **`backend/main.py`**

  * **What & How**: 当会话状态变为 `HUMAN_AGENT` 时，接口不再调用大模型，而是将消息流转到人工客服的消息队列（或模拟返回“人工客服已接入”的系统提示）。

* **`frontend/src/components/ChatBox.jsx`**

  * **What & How**: 接收到转人工状态时，界面顶部显示醒目的“人工客服接待中”横幅，并禁用部分仅限 AI 的交互提示。

### Phase 3: 后台管理与数据看板

*目标：为商家提供一个管理入口，能够管理 RAG 知识库及查看 AI 服务效果。*

* **`backend/agent/rag_tool.py`**

  * **What & How**: 扩展向量库操作，增加 `add_document_to_db` 函数，支持将新上传的 Markdown 或 PDF 切片后写入 ChromaDB。

* **`backend/main.py`**

  * **What & How**: 新增管理端 API，如 `/api/admin/stats`（获取 AI 解决率、转人工率、对话量等）和 `/api/admin/kb`（上传和管理知识库文件）。

* **`frontend/src/App.jsx`**

  * **What & How**: 引入 `react-router-dom`，划分出 `/chat`（面向用户）和 `/admin`（面向商家）两条路由路径。

* **`frontend/src/components/AdminDashboard.jsx`** **(新文件)**

  * **What & How**: 实现后台 UI，左侧导航栏，右侧分为“数据总览”和“知识库管理”面板。

## 4. 假设与决策 (Assumptions & Decisions)

* **流式通信方案**：采用 Server-Sent Events (SSE) 而非 WebSockets，因为 SSE 更适合单向文本流输出，实现更为轻量。

* **鉴权设计**：本计划暂不引入复杂的 JWT 用户登录体系（假设通过 URL 参数或测试环境写死的 User ID 识别身份），后台管理面板暂不加设复杂的 RBAC 权限系统，以便快速跑通核心流程。

## 5. 验证步骤 (Verification Steps)

1. **DB 验证**：运行 `python backend/database/init_db.py` 确保新的会话表创建成功。
2. **流式体验验证**：前端发送问题，能看到逐字输出效果，刷新页面后会话记录依然存在。
3. **转人工验证**：输入“我要投诉，让真人来”，系统停止 AI 自动回复，并明确提示“已为您转接人工客服”。
4. **后台管理验证**：访问 `/admin` 页面，查看“转人工率”等统计数据；成功上传一份新的退货政策文件，回到前台提问，AI 能基于最新政策进行回答。

