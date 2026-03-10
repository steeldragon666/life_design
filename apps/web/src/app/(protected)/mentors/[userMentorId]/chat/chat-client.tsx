'use client';

import { useState, useRef, useEffect } from 'react';
import ChatBubble from '@/components/mentors/chat-bubble';
import ChatInput from '@/components/mentors/chat-input';
import { sendMessage } from '../../actions';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatClientProps {
  userMentorId: string;
  initialMessages: Message[];
}

export default function ChatClient({
  userMentorId,
  initialMessages,
}: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(content: string) {
    const userMessage: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    const result = await sendMessage(userMentorId, 'stoic', content);

    if (result.text) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.text! },
      ]);
    }
    setLoading(false);
  }

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <p className="py-12 text-center text-gray-400">
            Start a conversation with your mentor.
          </p>
        )}
        {messages.map((msg, i) => (
          <ChatBubble key={i} role={msg.role} content={msg.content} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-100 px-4 py-2 text-gray-500">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t pt-4">
        <ChatInput onSend={handleSend} disabled={loading} />
      </div>
    </>
  );
}
