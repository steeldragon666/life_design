'use client';

import { useRouter } from 'next/navigation';
import MentorCard from '@/components/mentors/mentor-card';
import { activateUserMentor } from './actions';

interface MentorListClientProps {
  mentors: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
  }>;
  activeMentorMap: Record<string, string>;
}

export default function MentorListClient({
  mentors,
  activeMentorMap,
}: MentorListClientProps) {
  const router = useRouter();

  async function handleActivate(mentorId: string) {
    const result = await activateUserMentor(mentorId);
    if (!result.error) {
      router.refresh();
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {mentors.map((mentor) => (
        <MentorCard
          key={mentor.id}
          mentor={mentor}
          isActive={mentor.id in activeMentorMap}
          userMentorId={activeMentorMap[mentor.id]}
          onActivate={handleActivate}
        />
      ))}
    </div>
  );
}
