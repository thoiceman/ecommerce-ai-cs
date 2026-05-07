FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# 官方 deb.debian.org 在内地构建常极慢；默认改用阿里云，也可用构建参数换腾讯云等：
# docker compose build --build-arg APT_MIRROR=http://mirrors.cloud.tencent.com
ARG APT_MIRROR=http://mirrors.aliyun.com
RUN set -eux; \
    find /etc/apt -type f \( -name '*.sources' -o -name 'sources.list' \) -exec sed -i \
      -e "s|http://deb.debian.org|${APT_MIRROR}|g" \
      -e "s|https://deb.debian.org|${APT_MIRROR}|g" \
      -e "s|http://security.debian.org/debian-security|${APT_MIRROR}/debian-security|g" \
      -e "s|https://security.debian.org/debian-security|${APT_MIRROR}/debian-security|g" \
      {} +; \
    apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend /app

RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir \
    fastapi uvicorn langchain langchain-core langchain-community langgraph langchain-openai \
    chromadb sentence-transformers pymysql psycopg2-binary redis sqlalchemy python-dotenv \
    pydantic cryptography "numpy<2.0.0"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
