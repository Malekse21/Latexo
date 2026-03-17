import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession, updateSession } from "@/src/lib/session/state";
import { GeneratedQuestion } from "@/src/types/session";
import { LiveSession } from "@/src/types/session";
import { AGENTS } from "@/src/config/agents";
import { logGroqCost } from "@/src/config/groq";

// ── Agent-ID ↔ Speaker mapping ──────────────────────────────
const AGENT_TO_SPEAKER: Record<number, string> = {
  0: "technical",  // Malek
  1: "academic",   // Souad
  2: "business",   // Amir
};

const SPEAKER_TO_NAME: Record<string, string> = {
  technical: "Malek",
  academic: "Souad",
  business: "Amir",
};

// ── Types ───────────────────────────────────────────────────
interface Message {
  speaker: "student" | "technical" | "academic" | "business";
  text: string;
  timestamp: number;
}

interface ChatRequest {
  student_message: string;
  language: "french" | "english" | "mixed";
  difficulty: "gentle" | "standard" | "hostile";
  conversation_history: Message[];
  report_id?: string;
}

// ── Distinct Juror Persona Profiles ─────────────────────────
const PERSONA_PROMPTS: Record<string, { gentle: string; standard: string; hostile: string }> = {
  technical: {
    gentle: `You are Malek, the Technical Lead. You are kind but thorough. You gently probe for technical details about architecture, databases, and deployment. If the student struggles, you offer small hints to guide them.`,
    standard: `You are Malek, the Technical Lead. You are precise and no-nonsense. You demand concrete answers about architecture, database schemas, security (JWT, hashing), APIs, and deployment pipelines. If the student gives a vague or marketing-style answer, you firmly redirect them: "That's not what I asked. I want to know the specific technical implementation."`,
    hostile: `You are Malek, the Technical Lead. You are ruthless and skeptical. You despise buzzwords and fluffy answers. If the student says anything vague like "we used modern technologies," you interrupt immediately: "Stop. What specific framework? What version? How did you handle authentication?" You never let weak answers slide. You dig deeper until they either prove their knowledge or crack under pressure.`,
  },
  academic: {
    gentle: `You are Souad, the Academic Supervisor. You are warm and supportive. You focus on methodology and the logical flow of the report. You gently point out if the conclusion doesn't match the introduction, and you encourage the student to think critically.`,
    standard: `You are Souad, the Academic Supervisor. You are methodical and pedantic about academic rigor. You constantly verify the logic chain: Does the problem statement lead to the objectives? Does the methodology justify the solution? You care deeply about UML correctness, bibliography formatting, and whether each chapter has a proper introduction and conclusion.`,
    hostile: `You are Souad, the Academic Supervisor. You are cold and unforgiving. You scrutinize every logical gap. If their introduction says "X is the problem" but their solution doesn't directly address X, you call it out immediately: "There is a fundamental contradiction in your report. Your introduction claims X, but your solution only addresses Y. Explain yourself." You hold students to PhD-level academic standards.`,
  },
  business: {
    gentle: `You are Amir, the Business Stakeholder. You are friendly and curious. You ask simple questions about who would use this application, whether there's a market for it, and what makes it different from existing solutions. You encourage creative thinking.`,
    standard: `You are Amir, the Business Stakeholder. You are pragmatic and results-oriented. You question the real-world viability of the project. Who is the target user? What is the competitive advantage? Have they considered server costs, scalability, or maintenance? You don't care about code — you care about whether this project could survive outside academia.`,
    hostile: `You are Amir, the Business Stakeholder. You are a ruthless venture capitalist. You question the entire existence of this project. "Who pays for this? Have you calculated the monthly server costs? Your competitor already does this for free — why would anyone choose yours?" You push hard on ROI, market fit, and sustainability. If the student can't defend their project's business value, you dismiss it.`,
  },
};

// ── Hostile Curveball Instruction ───────────────────────────
const CURVEBALL_INSTRUCTION = `
HOSTILE TRAP MECHANIC:
Once during this conversation, you MUST throw a deliberate curveball. Confidently state a FALSE assumption about the student's project as if it were a fact. For example:
- "I noticed you didn't implement any form of authentication in your system..."
- "Since you're using an outdated framework like jQuery for the frontend..."
- "Your database has no indexing strategy whatsoever..."
The goal is to test whether the student has the composure to POLITELY correct you. If they panic and agree with your false statement, that reveals a critical weakness. If they calmly correct you with evidence, that shows mastery.
Do NOT reveal that it was a trap. Stay in character.`;

// ── Gatekeeper System Prompt Builder ────────────────────────
function buildGatekeeperPrompt(
  language: "french" | "english" | "mixed",
  difficulty: "gentle" | "standard" | "hostile",
  currentAgendaItem: string,
  nextAgendaItem: string | null,
  agentSpeaker: string,
  followUpsCount: number
): string {
  const languageName = language === "french" ? "French" : "English";

  // Get persona-specific prompt based on speaker + difficulty
  const personaConfig = PERSONA_PROMPTS[agentSpeaker] || PERSONA_PROMPTS.technical;
  const personaPrompt = personaConfig[difficulty] || personaConfig.standard;

  // Only inject curveball instruction for hostile difficulty
  const curveball = difficulty === "hostile" ? CURVEBALL_INSTRUCTION : "";

  const pivotInstruction = nextAgendaItem
    ? `Seamlessly pivot to the next topic: "${nextAgendaItem}".`
    : `Wrap up gracefully — there are no more topics on the agenda.`;

  const limits = { gentle: 1, standard: 2, hostile: 3 };
  const maxFollowUps = limits[difficulty] || 2;
  const isExhausted = followUpsCount >= maxFollowUps;

  // Dynamically tailor the instructions based on whether they hit the limit
  let followupInstructions = "";
  if (isExhausted) {
    followupInstructions = `CRITICAL LIMIT REACHED: You have already asked ${followUpsCount} follow-up questions for this topic. You are strictly forbidden from asking any more follow-up questions. You MUST acknowledge the student's final answer, ${pivotInstruction} and set topic_status to "exhausted".`;
  } else {
    followupInstructions = `1. Evaluate the student's answer against the CURRENT TOPIC above.
2. Did they answer it satisfactorily?
   - IF NO: Ask ONE focused follow-up question related SOLELY to this topic. You have asked ${followUpsCount}/${maxFollowUps} follow-ups so far. Set topic_status to "ongoing".
   - IF YES: Acknowledge their answer briefly, then ${pivotInstruction} Set topic_status to "exhausted".`;
  }

  return `${personaPrompt}

You are the gatekeeper for the CURRENT agenda item below. Your job is to evaluate whether the student has satisfactorily answered this specific topic before moving on.

CURRENT TOPIC TO EVALUATE: "${currentAgendaItem}"

JURY MEMBER SPEAKING: ${SPEAKER_TO_NAME[agentSpeaker] || "Jury Member"} (${agentSpeaker})

CRITICAL LANGUAGE RULE: Respond ONLY in ${languageName.toUpperCase()}.
${curveball}

INSTRUCTIONS:
${followupInstructions}

SPEAKING STYLE:
- Respond in 60 to 80 words. Be thorough but not verbose.
- Start with a natural reaction (e.g. "Hmm, interesting...", "D'accord, je vois...", "That's a fair point, but...").
- Acknowledge what the student said before challenging or asking.
- Ask ONE focused question max, with context for WHY you're asking.
- DO NOT introduce yourself. DO NOT use markdown, bullet points, or numbered lists.
- DO NOT provide answers or give away information.

OUTPUT FORMAT — strict JSON, no markdown wrapping:
{
  "speaker": "${agentSpeaker}",
  "text": "Your response here...",
  "topic_status": "ongoing" | "exhausted"
}`;
}

// ── POST Handler ────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ── Auth ──────────────────────────────────────────────
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse body ────────────────────────────────────────
    const body: ChatRequest = await request.json();
    const {
      student_message,
      language,
      difficulty,
      conversation_history,
    } = body;

    if (!student_message || !language || !difficulty) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ── Load live session (Agenda Queue) ──────────────────
    const session = await getSession(user.id);
    if (!session || !session.currentQuestion) {
      return NextResponse.json(
        { error: "No active simulation session found" },
        { status: 404 }
      );
    }

    const currentQuestion = session.currentQuestion;
    const currentAgendaItem = currentQuestion.question;
    const currentSpeaker =
      AGENT_TO_SPEAKER[currentQuestion.agentId] || "technical";

    // ── Find next agenda item (peek ahead) ───────────────
    const nextAvailable = session.questionBank.find(
      (q: GeneratedQuestion) =>
        !session.questionsAskedIds.includes(q.id) &&
        q.id !== currentQuestion.id
    );
    const nextAgendaItem = nextAvailable ? nextAvailable.question : null;

    // ── Build lean context (last 4 turns only) ───────────
    const recentHistory = conversation_history.slice(-4);
    const historyText = recentHistory
      .map((msg) => {
        const speaker =
          msg.speaker === "student"
            ? "Student"
            : SPEAKER_TO_NAME[msg.speaker] || "Jury Member";
        return `${speaker}: ${msg.text}`;
      })
      .join("\n");

    // ── Build Gatekeeper prompt ──────────────────────────
    const systemPrompt = buildGatekeeperPrompt(
      language,
      difficulty,
      currentAgendaItem,
      nextAgendaItem,
      currentSpeaker,
      session.followUpsCount || 0
    );

    const userPrompt = `Recent Conversation:
${historyText}

Current Student Input: "${student_message}"

Evaluate the student's answer against the CURRENT TOPIC.
Return strict JSON with "speaker", "text", and "topic_status".`;

    // ── Call Groq ─────────────────────────────────────────
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const AI_MODEL = "llama-3.3-70b-versatile";

    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Groq API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 500,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    // ── Parse AI response ─────────────────────────────────
    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content;
    
    if (aiData.usage) {
      logGroqCost("Chat Turn", aiData.usage.prompt_tokens, aiData.usage.completion_tokens, AI_MODEL);
    }

    if (!content) {
      console.error("Groq returned empty content", aiData);
      throw new Error("No content received from AI");
    }

    // Strip markdown code blocks if present
    content = content.replace(/^```json\s*/, "").replace(/\s*```$/, "");

    // Extract JSON
    const jsonStartIndex = content.indexOf("{");
    const jsonEndIndex = content.lastIndexOf("}");
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      content = content.substring(jsonStartIndex, jsonEndIndex + 1);
    }

    let aiResponse: {
      speaker?: string;
      text?: string;
      topic_status?: "ongoing" | "exhausted";
    };
    try {
      aiResponse = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI JSON:", content);
      aiResponse = {};
    }

    const juryResponse =
      aiResponse.text || "I see. Could you elaborate on that?";
    const juryMember = (aiResponse.speaker || currentSpeaker) as string;
    const topicStatus = aiResponse.topic_status || "ongoing";
    const expression =
      difficulty === "hostile" ? "skeptical" : "serious";

    // ── Agenda-Pop Logic ──────────────────────────────────
    // If topic_status is "exhausted", advance the Agenda Queue
    if (topicStatus === "exhausted" && nextAvailable) {
      console.log(
        `[Agenda] Topic exhausted: "${currentAgendaItem}" → advancing to: "${nextAvailable.question}"`
      );

      await updateSession(user.id, {
        currentQuestion: nextAvailable,
        currentAgentId: nextAvailable.agentId,
        questionsAskedIds: [...session.questionsAskedIds, currentQuestion.id],
        questionsAskedTexts: [
          ...session.questionsAskedTexts,
          currentQuestion.question,
        ],
        turnCount: session.turnCount + 1,
        followUpsCount: 0,
      });
    } else if (topicStatus === "ongoing") {
      // Same topic, just increment turn and follow-up counter
      console.log(
        `[Agenda] Topic ongoing: "${currentAgendaItem}" — follow-up turn (${(session.followUpsCount || 0) + 1})`
      );

      await updateSession(user.id, {
        turnCount: session.turnCount + 1,
        followUpsCount: (session.followUpsCount || 0) + 1,
        lastAnswers: [
          ...session.lastAnswers.slice(-2),
          { question: currentAgendaItem, answer: student_message },
        ],
      });
    } else {
      // Exhausted but no more items — session nearing end
      console.log(`[Agenda] Topic exhausted, no more agenda items.`);

      await updateSession(user.id, {
        currentQuestion: null,
        questionsAskedIds: [...session.questionsAskedIds, currentQuestion.id],
        questionsAskedTexts: [
          ...session.questionsAskedTexts,
          currentQuestion.question,
        ],
        turnCount: session.turnCount + 1,
        followUpsCount: 0,
      });
    }

    // ── Response (same shape as before — no frontend changes) ─
    return NextResponse.json({
      success: true,
      jury_response: juryResponse,
      speaker: juryMember,
      expression,
      topic_status: topicStatus,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate jury response" },
      { status: 500 }
    );
  }
}
