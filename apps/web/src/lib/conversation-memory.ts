export const DEFAULT_CONVERSATION_MEMORY_LIMIT = 50;

export type ConversationMemoryKind = 'key-fact' | 'exchange-summary';

export interface ConversationMemoryEntry {
  id: string;
  kind: ConversationMemoryKind;
  content: string;
  source?: string;
  createdAt: string;
}

interface AppendMemoryEntryInput {
  kind: ConversationMemoryKind;
  content: string;
  source?: string;
}

interface BuildMemorySnapshotOptions {
  maxEntries?: number;
}

function normalizeMemoryContent(content: string): string {
  return content.replace(/\s+/g, ' ').trim();
}

function createMemoryEntry(input: AppendMemoryEntryInput): ConversationMemoryEntry | null {
  const normalizedContent = normalizeMemoryContent(input.content);
  if (!normalizedContent) return null;

  return {
    id: `memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: input.kind,
    content: normalizedContent,
    source: input.source,
    createdAt: new Date().toISOString(),
  };
}

export function appendConversationMemoryEntry(
  currentMemory: ConversationMemoryEntry[],
  input: AppendMemoryEntryInput,
  maxEntries: number = DEFAULT_CONVERSATION_MEMORY_LIMIT
): ConversationMemoryEntry[] {
  const entry = createMemoryEntry(input);
  if (!entry) return currentMemory;

  const normalizedLimit = Math.max(1, maxEntries);
  const next = [...currentMemory, entry];
  if (next.length <= normalizedLimit) return next;

  return next.slice(next.length - normalizedLimit);
}

export function appendConversationKeyFact(
  currentMemory: ConversationMemoryEntry[],
  fact: string,
  source?: string,
  maxEntries: number = DEFAULT_CONVERSATION_MEMORY_LIMIT
): ConversationMemoryEntry[] {
  return appendConversationMemoryEntry(currentMemory, { kind: 'key-fact', content: fact, source }, maxEntries);
}

export function appendConversationExchangeSummary(
  currentMemory: ConversationMemoryEntry[],
  summary: string,
  source?: string,
  maxEntries: number = DEFAULT_CONVERSATION_MEMORY_LIMIT
): ConversationMemoryEntry[] {
  return appendConversationMemoryEntry(
    currentMemory,
    { kind: 'exchange-summary', content: summary, source },
    maxEntries
  );
}

export function buildConversationMemorySnapshot(
  memory: ConversationMemoryEntry[] | undefined,
  options: BuildMemorySnapshotOptions = {}
): string {
  if (!memory?.length) {
    return 'No conversation memory captured yet.';
  }

  const maxEntries = Math.max(1, options.maxEntries ?? 8);
  const recentEntries = memory.slice(-maxEntries);

  return recentEntries
    .map((entry) => {
      const label = entry.kind === 'key-fact' ? 'Fact' : 'Summary';
      const sourceText = entry.source ? ` (${entry.source})` : '';
      return `- ${label}${sourceText}: ${entry.content}`;
    })
    .join('\n');
}
