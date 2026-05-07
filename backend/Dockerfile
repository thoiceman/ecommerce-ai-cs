FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend /app

RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir \
    fastapi uvicorn langchain langchain-core langchain-community langgraph langchain-openai \
    chromadb sentence-transformers pymysql psycopg2-binary redis sqlalchemy python-dotenv \
    pydantic cryptography "numpy<2.0.0"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
