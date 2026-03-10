'use server';

import { createClient } from '@/lib/supabase/server';
import {
  getChatHistory,
  saveChatMessage,
  activateMentor,
} from '@/lib/services/mentor-service';
import { sendMentorMessage, buildSystemPrompt } from '@life-design/ai';
import { MentorType } from '@life-design/core';

export async function sendMessage(
  userMentorId: string,
  mentorType: string,
  content: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { text: null, error: 'Not authenticated' };
  }

  // Save user message
  await saveChatMessage(userMentorId, 'user', content);

  // Get chat history for context
  const { data: history } = await getChatHistory(userMentorId);
  const messages = (history ?? []).map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content as string,
  }));

  // Build system prompt and send to AI
  const systemPrompt = buildSystemPrompt(mentorType as MentorType);
  const result = await sendMentorMessage(messages, systemPrompt);

  // Save assistant response if successful
  if (result.text) {
    await saveChatMessage(userMentorId, 'assistant', result.text);
  }

  return { text: result.text, error: result.error };
}

export async function activateUserMentor(mentorId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  return activateMentor(user.id, mentorId);
}
