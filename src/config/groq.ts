// ── Groq AI Configuration ─────────────────────────────────
// All AI calls go through Groq's OpenAI-compatible API

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// Models
export const GROQ_MODEL_FAST = 'llama-3.3-70b-versatile';      // question gen, follow-ups
export const GROQ_MODEL_EVAL = 'llama-3.3-70b-versatile';      // evaluation (full power)

// Pricing per 1M tokens (Llama 3.3 70b)
const PRICE_PER_1M_PROMPT = 0.59;
const PRICE_PER_1M_COMPLETION = 0.79;
const USD_TO_TND_RATE = 3.10;

/**
 * Calculates and logs the cost of a Groq API call.
 */
export function logGroqCost(
  actionName: string,
  promptTokens: number,
  completionTokens: number,
  modelName: string = GROQ_MODEL_FAST
) {
  const promptCost = (promptTokens / 1_000_000) * PRICE_PER_1M_PROMPT;
  const completionCost = (completionTokens / 1_000_000) * PRICE_PER_1M_COMPLETION;
  const totalUsd = promptCost + completionCost;
  const totalTnd = totalUsd * USD_TO_TND_RATE;

  // Formatting for clean console output
  const usdFmt = totalUsd < 0.0001 ? '<$0.0001' : `$${totalUsd.toFixed(4)}`;
  const tndFmt = totalTnd < 0.0001 ? '<0.0001 TND' : `${totalTnd.toFixed(4)} TND`;

  console.log(
    `[💰 GROQ: ${actionName}] Model: ${modelName} | Tokens: ${promptTokens}in / ${completionTokens}out | Cost: ${usdFmt} (~${tndFmt})`
  );
}

export interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqCompletionOptions {
  model?: string;
  messages: GroqChatMessage[];
  max_tokens?: number;
  temperature?: number;
  response_format?: { type: 'json_object' | 'text' };
}

/**
 * Call Groq AI chat completions API.
 * Single function for all AI calls in the session workflow.
 */
export async function groqChat(options: GroqCompletionOptions): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const {
    model = GROQ_MODEL_FAST,
    messages,
    max_tokens = 2000,
    temperature = 0.7,
    response_format
  } = options;

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens,
    temperature,
  };

  if (response_format) {
    body.response_format = response_format;
  }

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Groq API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Groq returned empty content');
  }

  // Log token usage and cost
  if (data.usage) {
    logGroqCost(
      "groqChat Wrapper",
      data.usage.prompt_tokens,
      data.usage.completion_tokens,
      model
    );
  }

  return content;
}
