export type AssistantFallbackContext = 'onboarding' | 'default';

export function createAssistantFallbackMessage(context: AssistantFallbackContext): string {
  if (context === 'onboarding') {
    return 'Take your time. I am here whenever you are ready to continue.';
  }
  return "I'm here with you. Tell me more when you're ready.";
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 20_000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
