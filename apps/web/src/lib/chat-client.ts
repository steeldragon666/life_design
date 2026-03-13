import { fetchWithTimeout } from '@/lib/chat-resilience';

export type ChatRequestPayload = {
  message: string;
  [key: string]: unknown;
};

export type ChatRequestResult = {
  text: string;
  degraded: boolean;
  reason?: 'timeout' | 'network';
};

export async function requestChatText(options: {
  payload: ChatRequestPayload;
  fallbackText: string;
  timeoutMs?: number;
}): Promise<ChatRequestResult> {
  const { payload, fallbackText, timeoutMs = 20_000 } = options;
  try {
    const response = await fetchWithTimeout(
      '/api/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      timeoutMs,
    );
    if (!response.ok) {
      return { text: fallbackText, degraded: true, reason: 'network' };
    }
    const data = (await response.json()) as { text?: string };
    if (typeof data.text === 'string' && data.text.trim()) {
      return { text: data.text, degraded: false };
    }
    return { text: fallbackText, degraded: true, reason: 'network' };
  } catch (error) {
    if (error instanceof Error && error.message.includes('timed out')) {
      return { text: fallbackText, degraded: true, reason: 'timeout' };
    }
    return { text: fallbackText, degraded: true, reason: 'network' };
  }
}
