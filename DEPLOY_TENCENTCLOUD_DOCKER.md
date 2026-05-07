# 腾讯云服务器 Docker 部署操作教程

本文说明如何将 **ecommerce-ai-cs** 部署到腾讯云 CVM（或其它 Linux 云主机），使用 **Docker Compose** 一键拉起前端与后端。

## 1. 架构说明

| 组件 | 说明 |
|------|------|
| **backend** | FastAPI（Uvicorn），端口容器内 `8000`，默认映射宿主机 `8000` |
| **frontend** | Vite 构建的静态资源，由 Nginx 提供，映射宿主机 `80` |
| **SQLite** | 会话数据，存放在 Docker **命名卷** `backend_sqlite_data`（容器内路径 `/app/sqlite_data`） |
| **Chroma** | 向量库目录，存放在 Docker **命名卷** `backend_chroma_data`（`/app/database/chroma_db`） |

Compose 会通过环境变量覆盖 SQLite 路径为卷内路径，与本地开发用的 `backend/.env` 中的 `DATABASE_URL` 不冲突。

前端请求后端 API 的地址在 **构建镜像时** 写入（`VITE_API_BASE_URL`），换 IP/域名后需要 **重新构建 frontend 镜像**。

---

## 2. 服务器建议配置

- **系统**：Ubuntu 22.04 LTS（或其它常用 Linux）
- **规格**：至少 2 核 4G（首次构建与依赖安装较占资源）
- **磁盘**：建议 ≥ 40GB（镜像与向量数据会增长）

---

## 3. 安全组（腾讯云控制台）

在「云服务器 → 安全组」中为绑定实例的安全组添加入站规则：

| 端口 | 用途 |
|------|------|
| **22** | SSH |
| **80** | 前端页面（HTTP） |
| **8000** | 后端 API（浏览器当前会从页面直连该端口时必填） |

说明：若你以后改为「仅 80/443，由 Nginx 反代 `/api` 到后端」，可不再对公网开放 `8000`。

---

## 4. 安装 Docker 与 Compose（Ubuntu 示例）

SSH 登录服务器后执行：

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable docker
sudo systemctl start docker
```

将当前用户加入 `docker` 组（可选，避免每次 `sudo`）：

```bash
sudo usermod -aG docker $USER
# 重新登录 SSH 会话后生效，或执行：
newgrp docker
```

验证：

```bash
docker --version
docker compose version
```

---

## 5. 获取项目代码

```bash
sudo mkdir -p /opt/ecommerce-ai-cs
sudo chown -R "$USER:$USER" /opt/ecommerce-ai-cs

# 将下方地址换成你的仓库 URL
git clone <你的仓库地址> /opt/ecommerce-ai-cs
cd /opt/ecommerce-ai-cs
```

---

## 6. 配置环境变量

### 6.1 后端：`backend/.env`（必填）

**不要**把真实密钥提交到 Git。在服务器上新建：

```bash
cp backend/.env.example backend/.env
nano backend/.env   # 或使用 vim
```

按实际情况填写，例如：

```env
OPENAI_API_KEY=你的密钥
OPENAI_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
DASHSCOPE_API_KEY=你的百炼密钥

# 本地开发常用；在 Docker Compose 下会被 compose 里的 DATABASE_URL 覆盖，可不删不改
DATABASE_URL=sqlite:///./ecommerce_ai.db
```

确保服务器能访问模型与 Embedding 服务（出站网络正常）。

### 6.2 项目根目录 `.env`（供 Compose 替换前端构建参数）

Docker Compose 会读取**项目根目录**下的 `.env`，用于变量替换（与 `backend/.env` 是两回事）。

在 **`/opt/ecommerce-ai-cs`**（项目根）创建：

```bash
nano .env
```

写入（把地址换成你的**公网 IP**或带端口的**域名**；须与浏览器访问后端的地址一致）：

```env
VITE_API_BASE_URL=http://你的公网IP:8000
```

示例：

```env
VITE_API_BASE_URL=http://123.45.67.89:8000
```

若后端将来挂在反向代理的子路径或 HTTPS，此处改为最终用户在浏览器里请求的 API 根地址即可。

### 6.3 部署前自检（推荐）

在仓库根目录执行：

```bash
docker compose config
```

能正常打印合成后的 YAML 即表示 Compose 文件语法与变量替换无报错。

说明：**运行时**仍须在 **6.1** 中填写 `backend/.env` 里的密钥；当前 `docker-compose.yml` 将 `backend/.env` 设为 **可选**，便于在未放密钥时先执行 `docker compose build`。若你的环境报错「`env_file` 不支持 `path` / `required`」，说明 Docker Compose 版本过旧，请升级到 **v2.24+**，或将 `env_file` 改回 `- backend/.env` 单行写法并**先创建该文件**再执行 `compose up`。

---

## 7. 构建并启动

在项目根目录执行：

```bash
cd /opt/ecommerce-ai-cs
docker compose up -d --build
```

首次构建可能较慢（Python 依赖体积较大），属正常现象。

查看状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

---

## 8. 验证

### 8.1 后端健康检查

在服务器上：

```bash
curl -s http://127.0.0.1:8000/api/health
```

预期返回 JSON，包含 `"status":"ok"`。

### 8.2 浏览器访问

- 前端：`http://你的公网IP/`
- 若聊天失败，多数是 `VITE_API_BASE_URL` 不对或未重建前端，见下文「常见问题」。

---

## 9. 日常运维

### 9.1 更新代码后重新部署

```bash
cd /opt/ecommerce-ai-cs
git pull
docker compose up -d --build
```

### 9.2 仅修改了前端 API 地址

修改根目录 `.env` 中的 `VITE_API_BASE_URL` 后，必须重建前端：

```bash
docker compose up -d --build frontend
```

### 9.3 停止 / 删除容器（保留数据卷）

```bash
docker compose down
```

命名卷中的 SQLite 与 Chroma 数据仍会保留（除非手动 `docker volume rm`）。

### 9.4 备份数据（重要）

数据在 Docker 卷中，可通过临时容器导出，例如：

```bash
# 查看卷名（一般为 项目目录_backend_sqlite_data）
docker volume ls | grep ecommerce

# 示例：将 sqlite 卷拷贝到当前目录的备份文件夹（命名按实际卷名调整）
docker run --rm -v ecommerce-ai-cs_backend_sqlite_data:/data -v "$(pwd):/backup" alpine tar cvf /backup/sqlite_backup.tar -C /data .
docker run --rm -v ecommerce-ai-cs_backend_chroma_data:/data -v "$(pwd):/backup" alpine tar cvf /backup/chroma_backup.tar -C /data .
```

实际卷名以 `docker volume ls` 为准（前缀常与项目目录名相关）。

### 9.5 查看资源占用

```bash
docker stats
```

---

## 10. 生产环境建议（可选）

- 使用 **域名 + HTTPS**（Let’s Encrypt / 腾讯云 SSL），在主机或单独网关上做 Nginx/Caddy。
- 收紧后端 **CORS**：将 `backend/main.py` 中 `allow_origins=["*"]` 改为你的前端域名。
- **不要将** `backend/.env`、根目录 `.env` 提交到版本库；密钥最小权限保管。
- 中国大陆服务器可为 Docker 配置镜像加速，缩短镜像拉取时间。

---

## 11. 常见问题

### Q1：页面能打开，但聊天 / 管理后台请求失败

多为 **`VITE_API_BASE_URL` 与浏览器实际访问的后端地址不一致**，或安全组未放行 `8000`。

处理步骤：

1. 检查项目根目录 `.env` 中的 `VITE_API_BASE_URL`。
2. 执行：`docker compose up -d --build frontend`。
3. 强制刷新浏览器缓存后再试。

### Q2：后端启动报错（向量库 / 模型 / Key）

1. 查看：`docker compose logs -f backend`。
2. 确认 `backend/.env` 中 `OPENAI_API_KEY`、`DASHSCOPE_API_KEY`、`OPENAI_API_BASE` 正确。
3. 确认服务器可访问对应云服务 API。

### Q3：首次构建特别慢或超时

依赖与镜像 layer 较大；可重试 `docker compose build --no-cache backend`，或配置 Docker 镜像加速器后再构建。

### Q4：SQLite 数据存在哪里？

在 Docker 命名卷 **`backend_sqlite_data`** 映射的目录 `/app/sqlite_data` 中；由 Compose 的 `DATABASE_URL` 覆盖项指定，无需在宿主机手写数据库文件路径。

### Q5：报错 `no such table: chat_sessions`

说明 SQLite 文件已有但未建表。当前后端会在启动时自动执行 **`create_all`**（幂等、不清数据）。请 **`git pull` 后重建并重启 backend**：

```bash
docker compose up -d --build backend
```

若仍需写入 **`database/init_db.py`** 里的演示订单数据（脚本会先删表再建表，仅适合空库/Demo），在备份后再执行：

```bash
docker compose exec backend python database/init_db.py
```

### Q6：部署后是否自带演示订单 / 用户？

会。**后端启动时**若检测到库里**还没有任何用户**，会自动写入与本地一致的演示用户（张三、李四）及四条订单（含订单号 `ORD20250505001` 等）。已有真实用户数据时**不会**覆盖或重复插入。

若在 `.env` 中设置 **`SEED_DEMO_ON_EMPTY=false`**（或通过 Compose `environment` 注入），可关闭该行为。

---

## 12. 仓库内相关文件索引

| 文件 | 作用 |
|------|------|
| `docker-compose.yml` | 服务编排、卷、前端构建参数 |
| `backend/Dockerfile` | 后端镜像 |
| `frontend/Dockerfile` | 前端构建 + Nginx 运行镜像 |
| `frontend/nginx.conf` | 前端静态站点与 SPA `try_files` |
| `backend/.env.example` | 后端环境变量模板 |
| `backend/database/seed_demo.py` | 空库时幂等写入演示用户与订单 |
| `.dockerignore` | 减小构建上下文、避免把 `.env` 打进镜像 |

---

按上述步骤完成后，你应能通过 `http://公网IP/` 使用前端，并由浏览器根据构建时写入的 `VITE_API_BASE_URL` 访问后端 `8000` 端口。
