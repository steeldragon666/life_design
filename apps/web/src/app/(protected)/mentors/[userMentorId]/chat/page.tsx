import { getChatHistory } from '@/lib/services/mentor-service';
import ChatClient from './chat-client';

interface ChatPageProps {
  params: Promise<{ userMentorId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { userMentorId } = await params;
  const { data: messages } = await getChatHistory(userMentorId, 100);

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-4">
      <ChatClient
        userMentorId={userMentorId}
        initialMessages={
          (messages ?? []).map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }))
        }
      />
    </div>
  );
}
