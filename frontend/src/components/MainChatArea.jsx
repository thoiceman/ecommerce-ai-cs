import ChatBox from './ChatBox';
import InputArea from './InputArea';

export default function MainChatArea({ sessionStatus, messages, isLoading, streamPhase, handleSendMessage }) {
  return (
    <div className="flex-1 overflow-hidden py-6 px-4">
      <main className="h-full flex flex-col max-w-4xl mx-auto w-full bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-200">
        {sessionStatus === 'HUMAN_AGENT' && (
          <div className="bg-yellow-100 text-yellow-800 text-center py-2 text-sm font-medium flex items-center justify-center">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2"></span>
            人工客服接待中
          </div>
        )}
        <ChatBox messages={messages} isLoading={isLoading} streamPhase={streamPhase} onSendMessage={handleSendMessage} />
        <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} streamPhase={streamPhase} />
      </main>
    </div>
  );
}
