import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MainChatArea from './components/MainChatArea';
import { useChatStream } from './hooks/useChatStream';

function App() {
  const {
    sessions,
    currentSessionId,
    sessionStatus,
    messages,
    isLoading,
    streamPhase,
    createNewSession,
    selectSession,
    handleSendMessage
  } = useChatStream();

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar 
        sessions={sessions} 
        currentSessionId={currentSessionId} 
        createNewSession={createNewSession} 
        selectSession={selectSession} 
      />
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        <Header />
        <MainChatArea 
          sessionStatus={sessionStatus} 
          messages={messages} 
          isLoading={isLoading} 
          streamPhase={streamPhase}
          handleSendMessage={handleSendMessage} 
        />
      </div>
    </div>
  );
}

export default App;
