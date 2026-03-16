import { MentorType } from '@life-design/core';
import { getChatHistory, getUserMentorById } from '@/lib/services/mentor-service';
import { mentorTypeToArchetype, getArchetypeConfig } from '@/lib/mentor-archetypes';
import ChatClient from './chat-client';

interface ChatPageProps {
  params: Promise<{ userMentorId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { userMentorId } = await params;
  const [{ data: messages }, { data: userMentor }] = await Promise.all([
    getChatHistory(userMentorId, 100),
    getUserMentorById(userMentorId),
  ]);

  // Safe fallback: MentorType is a string enum (Stoic = 'stoic'), so 'stoic' is a valid value
  const mentorType = (userMentor?.mentor?.mentor_type ?? 'stoic') as MentorType;
  const archetype = mentorTypeToArchetype(mentorType);
  const config = getArchetypeConfig(archetype);

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
        mentorName={config.characterName}
        archetype={archetype}
      />
    </div>
  );
}
