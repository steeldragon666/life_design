import { createClient } from '@/lib/supabase/server';
import { listMentors, getUserMentors } from '@/lib/services/mentor-service';
import MentorListClient from './mentor-list-client';

export default async function MentorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: mentors } = await listMentors();
  const { data: userMentors } = await getUserMentors(user!.id);

  const activeMentorMap = new Map(
    (userMentors ?? []).map((um: { mentor_id: string; id: string }) => [
      um.mentor_id,
      um.id,
    ]),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">AI Mentors</h1>
      <p className="mb-8 text-gray-600">
        Choose a mentor to guide your personal development journey.
      </p>
      <MentorListClient
        mentors={mentors ?? []}
        activeMentorMap={Object.fromEntries(activeMentorMap)}
      />
    </div>
  );
}
