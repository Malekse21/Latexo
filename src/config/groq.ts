// ── Groq AI Configuration ─────────────────────────────────
// All AI calls go through Groq's OpenAI-compatible API

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// Models
export const GROQ_MODEL_FAST = 'llama-3.3-70b-versatile';      // question gen, follow-ups
export const GROQ_MODEL_EVAL = 'llama-3.3-70b-versatile';      // evaluation (full power)

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

  // Log token usage during development
  if (data.usage) {
    console.log(`[Groq] ${model} — ${data.usage.prompt_tokens}in/${data.usage.completion_tokens}out tokens`);
  }

  return content;
}
