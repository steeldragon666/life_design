interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
