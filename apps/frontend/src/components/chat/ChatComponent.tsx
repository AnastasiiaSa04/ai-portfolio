import { useEffect, useRef, useState } from 'react';
import { ChatMessage, ChatRequest, ChatResponse } from '@portfolio/shared';
import './Chat.css';
import { Typewriter } from '../typewriter/Typewriter';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

const QUICK_PROMPTS = [
  "What is your tech stack?",
  "Are you open for relocation?",
  "Show me your AI experience",
  "Download Resume"
];

const ChatComponent: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const executeChat = async (currentMessages: ChatMessage[]) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: currentMessages } as ChatRequest),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }

      setMessages([...currentMessages, { role: 'assistant', content: (data as ChatResponse).reply }]);
    } catch (error) {
      console.error('AI Error:', error);
      const message = error instanceof Error
        ? error.message
        : 'The assistant is temporarily unavailable.';
      setMessages([...currentMessages, { role: 'assistant', content: `AI assistant: ${message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput('');
    await executeChat(newMessages);
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: prompt };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    await executeChat(newMessages);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <span>AI_AGENT: ANASTASIIA_v1.0</span>
        <span className="chat-status">● LIVE</span>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <p className="ai-msg">_ Привет! Я — ИИ-близнец Анастасии. Спроси меня о её стеке или опыте.</p>
        )}
        
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'message-user' : 'message-ai'}>
            <strong>{m.role === 'user' ? '> GUEST: ' : '> AI: '}</strong>
            {m.role === 'assistant' ? (
              <Typewriter text={m.content} />
            ) : (
              m.content
            )}
          </div>
        ))}
        {isLoading && <p className="message-ai">_ Analyzing data...</p>}
      </div>

      <div className="quick-prompts">
        {QUICK_PROMPTS.map(p => (
          <button 
            key={p} 
            type="button"
            onClick={() => handleQuickPrompt(p)} 
            className="prompt-btn"
            disabled={isLoading}
          >
            {p}
          </button>
        ))}
      </div>

      <form className="chat-input-area" onSubmit={sendMessage}>
        <input 
          placeholder={isLoading ? "Processing..." : "Type command..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
      </form>
    </div>
  );
};

export default ChatComponent;
