import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatMessage, ChatRequest, ChatResponse } from '@portfolio/shared';
import './Chat.css';
import { Typewriter } from '../typewriter/Typewriter';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

const ChatComponent: React.FC = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickPrompts = t('chat.quickPrompts', { returnObjects: true }) as string[];

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
        throw new Error(data.error || t('chat.error'));
      }

      setMessages([...currentMessages, { role: 'assistant', content: (data as ChatResponse).reply }]);
    } catch (error) {
      console.error('AI Error:', error);
      const message = error instanceof Error
        ? error.message
        : t('chat.error');
      setMessages([
        ...currentMessages,
        { role: 'assistant', content: `${t('chat.errorLabel')}: ${message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
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
        <span>{t('chat.agentLabel')}</span>
        <span className="chat-status">● {t('chat.live')}</span>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <p className="ai-msg">{t('chat.welcome')}</p>
        )}

        {messages.map((message, index) => (
          <div key={index} className={message.role === 'user' ? 'message-user' : 'message-ai'}>
            <strong>
              {message.role === 'user'
                ? `> ${t('chat.guestLabel')}: `
                : `> ${t('chat.assistantLabel')}: `}
            </strong>
            {message.role === 'assistant' ? (
              <Typewriter text={message.content} />
            ) : (
              message.content
            )}
          </div>
        ))}
        {isLoading && <p className="message-ai">_ {t('chat.loading')}</p>}
      </div>

      <div className="quick-prompts">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => handleQuickPrompt(prompt)}
            className="prompt-btn"
            disabled={isLoading}
          >
            {prompt}
          </button>
        ))}
      </div>

      <form className="chat-input-area" onSubmit={sendMessage}>
        <input
          placeholder={isLoading ? t('chat.placeholderLoading') : t('chat.placeholder')}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isLoading}
        />
      </form>
    </div>
  );
};

export default ChatComponent;
