import { createClient } from '@/lib/supabase/server';
import { getUserMentors } from '@/lib/services/mentor-service';
import MentorClient from './mentor-client';

export const metadata = {
  title: 'AI Mentor | Opt In',
  description: 'Chat with your AI mentor for personalised guidance across all life dimensions.',
};

export default async function MentorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* Get the user's active mentor (if any) to obtain a userMentorId */
  let userMentorId: string | null = null;

  if (user) {
    const { data: userMentors } = await getUserMentors(user.id);
    const activeMentor = (userMentors ?? []).find(
      (um: { is_active: boolean }) => um.is_active,
    );
    if (activeMentor) {
      userMentorId = (activeMentor as { id: string }).id;
    }
  }

  return (
    <div className="h-full">
      <MentorClient userMentorId={userMentorId} />
    </div>
  );
}
