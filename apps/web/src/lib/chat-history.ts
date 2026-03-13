type HistoryRole = 'user' | 'assistant' | 'model';

export interface ChatHistoryItem {
  role: HistoryRole;
  content: string;
}

export interface ChatApiHistoryItem {
  role: 'user' | 'model';
  content: string;
}

export function buildBoundedHistory(
  items: ChatHistoryItem[],
  maxChars = 10_000,
): ChatApiHistoryItem[] {
  const safeMaxChars = Math.max(1, Math.floor(maxChars));
  const normalized = items
    .map((item): ChatApiHistoryItem => ({
      role: item.role === 'user' ? 'user' : 'model',
      content: typeof item.content === 'string' ? item.content.trim() : '',
    }))
    .filter((item) => item.content.length > 0);

  const result: ChatApiHistoryItem[] = [];
  let total = 0;
  for (let i = normalized.length - 1; i >= 0; i -= 1) {
    const next = normalized[i];
    const nextTotal = total + next.content.length;
    if (nextTotal > safeMaxChars) {
      if (result.length === 0) {
        result.unshift({
          role: next.role,
          content: next.content.slice(-safeMaxChars),
        });
      }
      break;
    }
    result.unshift(next);
    total = nextTotal;
  }
  return result;
}
