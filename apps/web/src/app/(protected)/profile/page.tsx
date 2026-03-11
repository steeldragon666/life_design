import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/services/profile-service';
import ProfileClient from './profile-client';
import { updateProfileAction } from './actions';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await getProfile(user.id);

  return (
    <ProfileClient
      initialProfile={profile ?? {
        profession: null,
        interests: [],
        projects: [],
        hobbies: [],
        skills: [],
        postcode: null,
      }}
      onSave={updateProfileAction}
    />
  );
}
