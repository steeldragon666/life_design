import { getGeminiClient } from './client';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatResult {
  text: string | null;
  error: string | null;
}

export async function sendMentorMessage(
  messages: ChatMessage[],
  systemPrompt: string,
  worldContext?: any,
): Promise<ChatResult> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
    });

    const contextStr = worldContext ? `\n\nCURRENT WORLD CONTEXT:\n${JSON.stringify(worldContext, null, 2)}` : '';

    const chat = model.startChat({
      history: [
        // Inject context into the first message or as a hidden turn if possible
        // But for Flash/Pro, adding it to the system instruction or first message is common.
        ...messages.slice(0, -1).map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }))
      ],
    });

    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage.content + contextStr;
    
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
