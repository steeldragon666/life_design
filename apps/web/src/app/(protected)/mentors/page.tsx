import { createClient } from '@/lib/supabase/server';
import Image from 'next/image';
import { listMentors, getUserMentors } from '@/lib/services/mentor-service';
import MentorListClient from './mentor-list-client';
import { Sparkles } from 'lucide-react';

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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/50 via-slate-800/30 to-blue-500/10 border border-white/5 p-8">
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
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Sparkles className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              AI Mentors
            </h1>
          </div>
          <p className="text-slate-400 font-medium max-w-lg">
            Choose a digital companion to guide your personal evolution. Each mentor brings a unique perspective to your life design journey.
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
