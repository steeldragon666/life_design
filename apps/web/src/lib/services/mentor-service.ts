import { createClient } from '@/lib/supabase/server';

export async function listMentors() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('mentors').select('*');
  return { data, error };
}

export async function activateMentor(userId: string, mentorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_mentors')
    .insert({ user_id: userId, mentor_id: mentorId, is_active: true })
    .select()
    .single();
  return { data, error };
}

export async function getUserMentors(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_mentors')
    .select('*, mentor:mentors(*)')
    .eq('user_id', userId);
  return { data, error };
}

export async function getChatHistory(userMentorId: string, messageLimit: number = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mentor_messages')
    .select('*')
    .eq('user_mentor_id', userMentorId)
    .order('created_at', { ascending: true })
    .limit(messageLimit);
  return { data, error };
}

export async function saveChatMessage(
  userMentorId: string,
  role: 'user' | 'assistant',
  content: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mentor_messages')
    .insert({ user_mentor_id: userMentorId, role, content })
    .select()
    .single();
  return { data, error };
}
