import { NextRequest } from 'next/server';

type ChatRole = 'user' | 'model';

export type SanitizedChatHistoryItem = {
  role: ChatRole;
  content: string;
};

export type SanitizedChatPayload = {
  message: string;
  history: SanitizedChatHistoryItem[];
};

export type ValidationError = {
  status: 400;
  message: string;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const MAX_MESSAGE_LENGTH = 4_000;
const MAX_HISTORY_ITEMS = 20;
const MAX_HISTORY_ITEM_LENGTH = 4_000;

type RateLimitEntry = {
  count: number;
  windowStart: number;
};

const RATE_LIMIT_STORE_KEY = '__chatRateLimitStore';

function getRateLimitStore(): Map<string, RateLimitEntry> {
  const globalState = globalThis as typeof globalThis & {
    [RATE_LIMIT_STORE_KEY]?: Map<string, RateLimitEntry>;
  };

  if (!globalState[RATE_LIMIT_STORE_KEY]) {
    globalState[RATE_LIMIT_STORE_KEY] = new Map<string, RateLimitEntry>();
  }

  return globalState[RATE_LIMIT_STORE_KEY];
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim() || 'unknown';
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }

  return 'unknown';
}

function normalizeInputText(value: string): string {
  return value.normalize('NFKC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function applyChatRateLimit(request: NextRequest): RateLimitResult {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `chat:${ip}`;
  const store = getRateLimitStore();
  const current = store.get(key);

  if (!current || now - current.windowStart >= RATE_LIMIT_WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now });

    return {
      allowed: true,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((RATE_LIMIT_WINDOW_MS - (now - current.windowStart)) / 1000)
    );

    return {
      allowed: false,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    allowed: true,
    limit: RATE_LIMIT_MAX_REQUESTS,
    remaining: RATE_LIMIT_MAX_REQUESTS - current.count,
    retryAfterSeconds: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - current.windowStart)) / 1000),
  };
}

function validateHistoryItem(item: unknown, index: number): SanitizedChatHistoryItem {
  if (!item || typeof item !== 'object') {
    throw { status: 400, message: `history[${index}] must be an object` } satisfies ValidationError;
  }

  const rawRole = (item as { role?: unknown }).role;
  const rawContent = (item as { content?: unknown }).content;

  if (typeof rawRole !== 'string') {
    throw { status: 400, message: `history[${index}].role must be a string` } satisfies ValidationError;
  }

  if (typeof rawContent !== 'string') {
    throw { status: 400, message: `history[${index}].content must be a string` } satisfies ValidationError;
  }

  const role = rawRole === 'user' ? 'user' : rawRole === 'model' || rawRole === 'assistant' ? 'model' : null;
  if (!role) {
    throw {
      status: 400,
      message: `history[${index}].role must be one of: user, model, assistant`,
    } satisfies ValidationError;
  }

  const content = normalizeInputText(rawContent).trim();
  if (!content) {
    throw { status: 400, message: `history[${index}].content is required` } satisfies ValidationError;
  }

  if (content.length > MAX_HISTORY_ITEM_LENGTH) {
    throw {
      status: 400,
      message: `history[${index}].content exceeds max length of ${MAX_HISTORY_ITEM_LENGTH}`,
    } satisfies ValidationError;
  }

  return { role, content };
}

export function validateAndNormalizeChatPayload(payload: unknown): SanitizedChatPayload {
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, message: 'Request body must be a JSON object' } satisfies ValidationError;
  }

  const rawMessage = (payload as { message?: unknown }).message;
  const rawHistory = (payload as { history?: unknown }).history;

  if (typeof rawMessage !== 'string') {
    throw { status: 400, message: 'message must be a string' } satisfies ValidationError;
  }

  const message = normalizeInputText(rawMessage).trim();
  if (!message) {
    throw { status: 400, message: 'message is required' } satisfies ValidationError;
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    throw {
      status: 400,
      message: `message exceeds max length of ${MAX_MESSAGE_LENGTH}`,
    } satisfies ValidationError;
  }

  if (rawHistory !== undefined && !Array.isArray(rawHistory)) {
    throw { status: 400, message: 'history must be an array' } satisfies ValidationError;
  }

  const historyInput = (rawHistory ?? []) as unknown[];
  if (historyInput.length > MAX_HISTORY_ITEMS) {
    throw {
      status: 400,
      message: `history exceeds max items of ${MAX_HISTORY_ITEMS}`,
    } satisfies ValidationError;
  }

  const history = historyInput.map((item, index) => validateHistoryItem(item, index));
  return { message, history };
}

export function normalizeAndSanitizeOutputText(text: string): string {
  const normalized = text
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

  return escapeHtml(normalized);
}
