import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import {
  applyChatRateLimit,
  composeBoundedChatMessage,
  normalizeAndSanitizeOutputText,
  SanitizedChatMetadata,
  validateAndNormalizeChatMetadata,
  validateAndNormalizeChatPayload,
  ValidationError,
} from '@/lib/chat-security';

function buildCorrelationContext(
  insights?: SanitizedChatMetadata['correlationInsights']
): string {
  if (!insights || insights.length === 0) return '';
  const lines = insights
    .slice(0, 5)
    .map((insight) => {
      const a = insight.dimensionA ?? 'unknown_a';
      const b = insight.dimensionB ?? 'unknown_b';
      const r = typeof insight.coefficient === 'number' ? insight.coefficient.toFixed(2) : 'n/a';
      const lag =
        typeof insight.lagDays === 'number' && insight.lagDays !== 0
          ? `, lag ${insight.lagDays} day(s)`
          : '';
      const confidence =
        typeof insight.confidence === 'number'
          ? `, confidence ${Math.round(insight.confidence * 100)}%`
          : '';
      return `- ${a} ↔ ${b}: r=${r}${lag}${confidence}`;
    })
    .join('\n');
  return `\n\nDetected cross-domain patterns (exploratory):\n${lines}\nFrame as patterns worth exploring, not causal proof.`;
}

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function persistConversationSummary(params: {
  userId?: string;
  source?: string;
  userMessage: string;
  responseText: string;
}) {
  try {
    if (!params.userId) return;
    const supabase = getServiceRoleClient();
    if (!supabase) return;
    const summary = `User: "${params.userMessage.slice(0, 250)}" | Mentor: "${params.responseText.slice(0, 350)}"`;
    await supabase.from('mentor_conversation_summaries').insert({
      user_id: params.userId,
      source: params.source ?? 'chat',
      user_message: params.userMessage.slice(0, 4000),
      mentor_response: params.responseText.slice(0, 8000),
      summary,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Do not fail chat delivery when persistence layer is unavailable.
  }
}

async function fetchRecentConversationSummaries(userId?: string): Promise<string[]> {
  try {
    if (!userId) return [];
    const supabase = getServiceRoleClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('mentor_conversation_summaries')
      .select('summary')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) return [];
    return (data ?? [])
      .map((item: { summary?: string }) => item.summary)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = applyChatRateLimit(request);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many chat requests. Please retry shortly.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          },
        }
      );
    }

    const payload = await request.json();
    const { message, history = [] } = validateAndNormalizeChatPayload(payload);
    const metadata = validateAndNormalizeChatMetadata(payload);
    const wantsStream = metadata.stream === true;

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const systemInstruction =
      typeof metadata.systemPrompt === 'string' && metadata.systemPrompt.trim().length > 0
        ? metadata.systemPrompt.trim()
        : undefined;
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      ...(systemInstruction ? { systemInstruction } : {}),
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 1024,
      },
    });

    const correlationContext = buildCorrelationContext(metadata.correlationInsights);
    const memoryContext =
      metadata.includePersistedMemory && metadata.userId
        ? await fetchRecentConversationSummaries(metadata.userId)
        : [];
    const memorySuffix =
      memoryContext.length > 0
        ? `\n\nRecent conversation memory:\n${memoryContext.map((item) => `- ${item}`).join('\n')}`
        : '';
    const finalMessage = composeBoundedChatMessage(message, [correlationContext, memorySuffix]);

    // Build the conversation
    const chat = model.startChat({
      history: history.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    });

    if (wantsStream) {
      const encoder = new TextEncoder();
      const streamResult = await chat.sendMessageStream(finalMessage);

      const stream = new ReadableStream({
        async start(controller) {
          let fullText = '';
          try {
            for await (const chunk of streamResult.stream) {
              const text = normalizeAndSanitizeOutputText(chunk.text() ?? '');
              if (!text) continue;
              fullText += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`));
            }

            if (metadata.persistConversation) {
              await persistConversationSummary({
                userId: metadata.userId,
                source: metadata.source,
                userMessage: message,
                responseText: fullText,
              });
            }
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'done', text: fullText })}\n\n`)
            );
          } catch (streamError) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'error',
                  error:
                    streamError instanceof Error ? streamError.message : 'Streaming response failed',
                })}\n\n`
              )
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      });
    }

    const result = await chat.sendMessage(finalMessage);
    const response = await result.response;
    const text = normalizeAndSanitizeOutputText(response.text());

    if (metadata.persistConversation) {
      await persistConversationSummary({
        userId: metadata.userId,
        source: metadata.source,
        userMessage: message,
        responseText: text,
      });
    }

    return NextResponse.json(
      { text },
      {
        headers: {
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && (error as ValidationError).status === 400) {
      return NextResponse.json(
        {
          error: (error as ValidationError).message,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
