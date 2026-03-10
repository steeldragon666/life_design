import { getAnthropicClient } from './client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  text: string | null;
  error: string | null;
}

export async function sendMentorMessage(
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<ChatResult> {
  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    return {
      text: textBlock ? textBlock.text : '',
      error: null,
    };
  } catch (err) {
    return {
      text: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
