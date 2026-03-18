import { getGeminiClient } from './client';

export interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
}

export interface ChatResult {
  text: string | null;
  error: string | null;
}

export interface ChatStreamChunk {
  text: string;
}

function mapMessageRole(role: ChatMessage['role']): 'user' | 'model' {
  return role === 'user' ? 'user' : 'model';
}

function buildWorldContextSuffix(worldContext?: unknown): string {
  if (!worldContext) return '';
  return `\n\nCURRENT WORLD CONTEXT:\n${JSON.stringify(worldContext, null, 2)}`;
}

export async function sendMentorMessage(
  messages: ChatMessage[],
  systemPrompt: string,
  worldContext?: Record<string, unknown>,
): Promise<ChatResult> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
    });

    const contextSuffix = buildWorldContextSuffix(worldContext);

    const chat = model.startChat({
      history: [
        ...messages.slice(0, -1).map(m => ({
          role: mapMessageRole(m.role),
          parts: [{ text: m.content }]
        }))
      ],
    });

    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage.content + contextSuffix;

    const result = await chat.sendMessage(prompt);
    const response = await result.response;

    return {
      text: response.text(),
      error: null,
    };
  } catch (err) {
    return {
      text: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function* streamMentorMessage(
  messages: ChatMessage[],
  systemPrompt: string,
  worldContext?: unknown,
): AsyncGenerator<ChatStreamChunk, ChatResult, void> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
    });

    const contextSuffix = buildWorldContextSuffix(worldContext);
    const chat = model.startChat({
      history: messages.slice(0, -1).map((message) => ({
        role: mapMessageRole(message.role),
        parts: [{ text: message.content }],
      })),
    });

    const lastMessage = messages[messages.length - 1];
    const prompt = `${lastMessage.content}${contextSuffix}`;
    const streamResult = await chat.sendMessageStream(prompt);
    let fullText = '';

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (!text) continue;
      fullText += text;
      yield { text };
    }

    return {
      text: fullText,
      error: null,
    };
  } catch (err) {
    return {
      text: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
