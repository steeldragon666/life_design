import { createClient } from '@/lib/supabase/server';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import { listMentors, getUserMentors } from '@/lib/services/mentor-service';
import MentorListClient from './mentor-list-client';

export default async function MentorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: mentors } = await listMentors();
  const { data: userMentors } = user ? await getUserMentors(user.id) : { data: null };

  const activeMentorMap = new Map(
    (userMentors ?? []).map((um: { mentor_id: string; id: string }) => [
      um.mentor_id,
      um.id,
    ]),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Hero Header with AI Mentor Illustration */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sage-50 to-sage-100/50 border border-stone-200 p-8">
        <div className="absolute top-0 right-0 w-72 h-72 opacity-70">
          <Image
            src="/images/ai-mentor-illustration.png"
            alt="AI Mentor"
            width={288}
            height={288}
            className="object-contain"
            priority
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-sage-100">
              <Sparkles className="h-6 w-6 text-sage-500" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight font-serif">
              AI Mentors
            </h1>
          </div>
          <p className="text-stone-500 font-medium max-w-lg">
            Choose a digital companion to guide your personal evolution. Each mentor brings a unique perspective to your Opt In journey.
          </p>
        </div>
      </div>

      <MentorListClient
        mentors={mentors ?? []}
        activeMentorMap={Object.fromEntries(activeMentorMap)}
      />
    </div>
  );
}
