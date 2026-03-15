import { groqChat, GROQ_MODEL_FAST } from '../config/groq';
import { AGENTS } from '../config/agents';
import { AgentId, PdfContext } from '../types/session';

// ── Follow-up generator (weak answer path) ─────────────────
export async function generateFollowUp(
  originalQuestion: string,
  weakAnswer: string,
  agentId: AgentId,
  pdfContext: PdfContext
): Promise<string> {

  const agent = AGENTS[agentId];

  const prompt =
`${agent.personality}

You asked: "${originalQuestion}"
Student answered: "${weakAnswer.slice(0, 200)}"
Project domain: ${pdfContext.domain}

The answer was weak. Generate ONE follow-up under 20 words that:
- Challenges a specific thing they said OR rephrases more directly
- Stays on the same topic
- Matches your personality

Return ONLY the question as plain text. No quotes. No explanation.`;

  const content = await groqChat({
    model: GROQ_MODEL_FAST,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 60,
    temperature: 0.6,
  });

  return content.trim() || originalQuestion;
}

// ── More questions generator (bank exhausted) ──────────────
export async function generateMoreQuestions(
  askedTexts: string[],
  agentId: AgentId,
  pdfContext: PdfContext,
  weakTopics: string[] = []
): Promise<string[]> {

  const agent = AGENTS[agentId];

  const prompt =
`${agent.personality}

You already asked these questions:
${askedTexts.slice(-10).map((q, i) => `${i + 1}. ${q}`).join('\n')}

Project: ${pdfContext.title}
Domain: ${pdfContext.domain}
Weak topics: ${weakTopics.join(', ')}

Generate 5 NEW questions that:
1. Go deeper on topics already discussed
2. Ask for justification of things already mentioned
3. Introduce what-if variations
4. Do NOT repeat any question above
5. Each under 2 sentences

Return ONLY a JSON array of 5 strings:
["question 1", "question 2", "question 3", "question 4", "question 5"]`;

  const content = await groqChat({
    model: GROQ_MODEL_FAST,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400,
    temperature: 0.7,
  });

  try {
    // Strip markdown code blocks if present
    const cleaned = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Fallback: extract lines if JSON fails
    return content
      .split('\n')
      .filter(l => l.trim().length > 10)
      .slice(0, 5);
  }
}
