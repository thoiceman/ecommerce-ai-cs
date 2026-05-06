import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Package, ChevronRight, Sparkles, Wrench, LoaderCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

const TOOL_EVENT_PATTERN = /\[TOOL_EVENT:({[\s\S]*?})\]/g;
const LEGACY_TOOL_STATUS_PATTERN = /\*\[正在调用工具:\s*([^[\]*]+?)\]\*/g;
const ORDER_SELECTOR_PATTERN = /\[ORDER_SELECTOR_TRIGGERED:(\[[\s\S]*?\])\]/;

const TOOL_META = {
  search_policy: {
    label: '政策检索',
    description: '检索退换货、运费与退款规则依据。',
  },
  get_recent_orders: {
    label: '近期订单查询',
    description: '拉取最近订单，准备展示可选订单卡片。',
  },
  get_order_status: {
    label: '订单状态查询',
    description: '查询订单状态、物流与履约进度。',
  },
  request_return: {
    label: '退货申请',
    description: '提交退货请求并准备返回处理结果。',
  },
  transfer_to_human: {
    label: '转接人工',
    description: '切换到人工客服继续处理当前会话。',
  },
};

function getToolMeta(toolName) {
  return TOOL_META[toolName] || {
    label: toolName,
    description: '正在调用外部工具补充信息。',
  };
}

function normalizeToolEvent(event, fallbackIndex) {
  if (!event?.tool) return null;

  return {
    key: event.call_id || `${event.tool}-${fallbackIndex}`,
    toolName: event.tool,
    event: event.event || 'start',
    detail: event.detail || '',
  };
}

function collectToolStates(events) {
  const toolStateMap = new Map();

  events.forEach((rawEvent, index) => {
    const event = normalizeToolEvent(rawEvent, index);
    if (!event) return;

    const current = toolStateMap.get(event.key) || {
      key: event.key,
      toolName: event.toolName,
      status: 'start',
      detail: '',
    };

    current.toolName = event.toolName;
    current.status = event.event === 'error' ? 'error' : event.event === 'complete' ? 'complete' : 'start';
    if (event.detail) {
      current.detail = event.detail;
    }

    toolStateMap.set(event.key, current);
  });

  return Array.from(toolStateMap.values());
}

function parseAssistantContent(rawContent) {
  let content = rawContent;
  let orderData = null;
  const toolEvents = [];

  const orderMatch = content.match(ORDER_SELECTOR_PATTERN);
  if (orderMatch) {
    try {
      orderData = JSON.parse(orderMatch[1]);
      content = content.replace(orderMatch[0], '');
    } catch (error) {
      console.error('解析订单数据失败', error);
    }
  }

  content = content.replace(TOOL_EVENT_PATTERN, (_, payload) => {
    try {
      toolEvents.push(JSON.parse(payload));
    } catch (error) {
      console.error('解析工具状态事件失败', error);
    }
    return '';
  });

  content = content.replace(LEGACY_TOOL_STATUS_PATTERN, (_, toolName) => {
    if (toolName?.trim()) {
      toolEvents.push({
        event: 'start',
        tool: toolName.trim(),
      });
    }
    return '';
  });

  const toolStates = collectToolStates(toolEvents);
  const segments = [];
  const markdownContent = content.trim();

  if (markdownContent) {
    segments.push({
      type: 'markdown',
      content: markdownContent,
    });
  }

  if (toolStates.length > 0) {
    segments.unshift({
      type: 'system-status',
      items: toolStates,
    });
  }

  return { segments, orderData };
}

function ToolStatusIcon({ status }) {
  if (status === 'complete') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }

  if (status === 'error') {
    return <AlertTriangle className="h-4 w-4 text-rose-600" />;
  }

  return <LoaderCircle className="h-4 w-4 animate-spin text-sky-600" />;
}

function ToolStatusBadge({ status }) {
  const statusMeta = {
    start: {
      label: '调用中',
      className: 'border-sky-200 bg-sky-50 text-sky-700',
    },
    complete: {
      label: '已完成',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    error: {
      label: '失败',
      className: 'border-rose-200 bg-rose-50 text-rose-700',
    },
  };

  const meta = statusMeta[status] || statusMeta.start;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function SystemStatusCard({ items }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-4 text-white shadow-lg shadow-slate-200/80">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.24),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_28%)]" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 backdrop-blur-sm">
              <Wrench className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200/90">
                System Status
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                工具链执行状态
              </div>
            </div>
          </div>
          <div className="hidden rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] text-slate-200 sm:block">
            {items.length} 项
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const meta = getToolMeta(item.toolName);

            return (
              <div
                key={item.key}
                className="rounded-2xl border border-white/10 bg-white/8 px-3.5 py-3 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <ToolStatusIcon status={item.status} />
                      <span>{meta.label}</span>
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-300">
                      {item.detail || meta.description}
                    </div>
                    {meta.label !== item.toolName && (
                      <div className="mt-2 text-[11px] text-slate-400">
                        工具标识: {item.toolName}
                      </div>
                    )}
                  </div>
                  <ToolStatusBadge status={item.status} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ChatBox({ messages, isLoading, streamPhase, onSendMessage }) {
  const messagesEndRef = useRef(null);

  // 每次消息更新后自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
      {messages.map((msg, index) => {
        // 忽略系统提示消息（如果有的话）
        if (msg.role === 'system') return null;
        
        const isUser = msg.role === 'user';
        
        const content = msg.content;
        const { segments, orderData } = parseAssistantContent(content);
        
        return (
          <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* 头像 */}
              <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-600 ml-3' : 'bg-emerald-500 mr-3 mt-1'}`}>
                {isUser ? <User className="text-white w-5 h-5" /> : <Bot className="text-white w-5 h-5" />}
              </div>
              
              {/* 消息内容区 */}
              <div className="flex flex-col space-y-2">
                {isUser && content.trim() && (
                  <div className={`px-5 py-3 rounded-2xl shadow-sm prose prose-sm max-w-none break-words ${
                    isUser 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                  }`}>
                    <ReactMarkdown>
                      {content}
                    </ReactMarkdown>
                  </div>
                )}

                {!isUser && segments.map((segment, segmentIndex) => {
                  if (segment.type === 'system-status') {
                    return <SystemStatusCard key={`${index}-system-${segmentIndex}`} items={segment.items} />;
                  }
                  
                  return (
                    <div
                      key={`${index}-text-${segmentIndex}`}
                      className="px-5 py-3 rounded-2xl shadow-sm prose prose-sm max-w-none break-words bg-white border border-gray-200 text-gray-800 rounded-tl-none"
                    >
                      <ReactMarkdown>
                        {segment.content}
                      </ReactMarkdown>
                    </div>
                  );
                })}
                
                {/* 订单选择卡片 */}
                {orderData && Array.isArray(orderData) && orderData.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mt-2">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700 flex items-center">
                      <Package className="w-4 h-4 mr-2" />
                      请选择您要咨询的订单
                    </div>
                    <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                      {orderData.map((order, idx) => (
                        <button 
                          key={idx}
                          onClick={() => onSendMessage && onSendMessage(`我要咨询订单：${order.order_no}`)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">{order.product_name}</div>
                            <div className="text-xs text-gray-500 mt-1 flex space-x-3">
                              <span>订单号: {order.order_no}</span>
                              <span className="text-emerald-600">{order.status}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
            </div>
          </div>
        );
      })}
      
      {/* 等待首个响应 */}
      {streamPhase === 'waiting' && (
        <div className="flex justify-start">
          <div className="flex max-w-[85%] flex-row">
            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-emerald-500 mr-3 flex items-center justify-center">
              <Bot className="text-white w-5 h-5" />
            </div>
            <div className="min-w-[220px] px-5 py-4 rounded-2xl bg-white border border-emerald-100 text-gray-800 rounded-tl-none shadow-sm">
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>正在准备回复</span>
              </div>
              <div className="mt-3 flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                正在连接模型与工具链，首条内容会立即开始流式显示。
              </div>
            </div>
          </div>
        </div>
      )}
      {streamPhase === 'streaming' && isLoading && (
        <div className="flex justify-start">
          <div className="ml-12 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/90 px-3 py-1 text-xs text-emerald-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>正在流式回复</span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
