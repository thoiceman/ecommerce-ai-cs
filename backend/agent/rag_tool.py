import os
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import DashScopeEmbeddings
from langchain_community.vectorstores import Chroma

# 配置向量数据库存储路径
PERSIST_DIRECTORY = os.path.join(os.path.dirname(__file__), "../database/chroma_db")
POLICY_FILE = os.path.join(os.path.dirname(__file__), "../data/policy.md")

# 全局单例，避免每次查询都重新加载模型和数据库
_vector_store = None

def get_vector_store():
    global _vector_store
    if _vector_store is not None:
        return _vector_store

    from dotenv import load_dotenv
    load_dotenv()
    
    # 使用阿里云 DashScope 的 Embedding 模型
    embeddings = DashScopeEmbeddings(
        model="text-embedding-v2",
        dashscope_api_key=os.environ.get("DASHSCOPE_API_KEY") or os.environ.get("OPENAI_API_KEY")
    )
    
    # 如果数据库已经存在，直接加载
    if os.path.exists(PERSIST_DIRECTORY):
        _vector_store = Chroma(persist_directory=PERSIST_DIRECTORY, embedding_function=embeddings)
        return _vector_store
    
    # 如果不存在，读取 Markdown 文件并构建
    print("正在初始化知识库向量数据，请稍候...")
    if not os.path.exists(POLICY_FILE):
        raise FileNotFoundError(f"找不到政策文件: {POLICY_FILE}")
        
    loader = TextLoader(POLICY_FILE, encoding="utf-8")
    documents = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=300,
        chunk_overlap=50,
    )
    docs = text_splitter.split_documents(documents)
    
    _vector_store = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        persist_directory=PERSIST_DIRECTORY
    )
    print("知识库向量化完成。")
    return _vector_store

from langchain_core.documents import Document

def add_document_to_db(content: str, source: str = "custom_upload.md"):
    """
    将新的文档内容写入 ChromaDB 向量库
    """
    vector_store = get_vector_store()
    
    # 构造 Document 对象
    doc = Document(page_content=content, metadata={"source": source})
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=300,
        chunk_overlap=50,
    )
    docs = text_splitter.split_documents([doc])
    
    vector_store.add_documents(docs)
    print(f"成功将 {len(docs)} 个文本块存入知识库。")
    return len(docs)

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

def rewrite_query(query: str) -> str:
    """使用 LLM 将用户的口语化提问改写为标准的知识库检索词"""
    llm = ChatOpenAI(model="qwen-max", temperature=0.1)
    prompt = f"你是一个电商知识库检索助手。请将以下用户的口语化提问改写为适合在退换货政策知识库中检索的标准关键词或短语，只返回改写后的关键词，不要有多余的话。\n\n用户提问：{query}"
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        return response.content.strip()
    except Exception as e:
        print(f"Query重写失败，使用原词: {e}")
        return query

def query_policy(query: str) -> str:
    """
    检索电商退换货政策文档，回答用户关于规则的问题。
    """
    vector_store = get_vector_store()
    
    # 1. 经过 Query Rewriting 提升检索准确度
    rewritten_query = rewrite_query(query)
    print(f"Original Query: {query} | Rewritten Query: {rewritten_query}")
    
    # 2. 检索最相关的 3 个文档片段
    docs = vector_store.similarity_search(rewritten_query, k=3)
    if not docs:
        return "没有找到相关的政策说明。"
    
    context = "\n\n".join([doc.page_content for doc in docs])
    return context

if __name__ == "__main__":
    # 测试一下
    print(query_policy("退货运费谁出？"))
