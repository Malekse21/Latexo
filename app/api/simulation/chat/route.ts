import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

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

// Jury member profiles
const JURY_PROFILES = {
  technical: {
    name: "Malek",
    title: "Technical Expert",
    role: "Focus on system architecture, code efficiency, and technical decisions. Ask probing questions about implementation details, scalability, and technology choices.",
  },
  academic: {
    name: "Souad",
    title: "Strict Academic",
    role: "Focus on research methodology, structural compliance, and formal logic. Question the rigor of the research process and academic standards.",
  },
  business: {
    name: "Amir",
    title: "Business Strategist",
    role: "Focus on innovation, market value, and scalability. Ask about business viability, market fit, and real-world impact.",
  },
};

/**
 * Select next jury member to speak (round-robin)
 */
function selectNextJuryMember(
  history: Message[]
): "technical" | "academic" | "business" {
  // No longer using fixed rotation
  return "technical"; // Fallback placeholder
}

/**
 * Build AI system prompt with language enforcement and dynamic speaker selection
 */
function buildSystemPrompt(
  language: "french" | "english" | "mixed",
  difficulty: "gentle" | "standard" | "hostile",
  skeletonData?: any
): string {
  const languageName = language === "french" ? "French" : "English";

  let tone = "";
  if (difficulty === "hostile") {
    tone = "Be aggressive and critical. Look for contradictions and weaknesses. Challenge every claim. Focus on the 'vulnerabilities' and 'critical_questions' found in the report analysis.";
  } else if (difficulty === "gentle") {
    tone = "Be supportive and encouraging. Guide the student with helpful questions. Help them bridge any 'logic_gaps' identified.";
  } else {
    tone = "Be professional and thorough. Ask realistic academic questions based on the 'technical_fingerprint' and 'logic_chain'.";
  }

  let skeletonContext = "";
  if (skeletonData) {
    skeletonContext = `
PROJECT DATA (FOR YOUR REFERENCE ONLY - DO NOT REVEAL DIRECTLY):
- Innovation Score: ${skeletonData.project_meta?.innovation_score}
- Core Problem: ${skeletonData.logic_chain?.problem}
- Solution: ${skeletonData.logic_chain?.solution}
- Logic Gaps: ${skeletonData.logic_chain?.logic_gap}
- Tech Stack: ${skeletonData.technical_fingerprint?.stack?.join(", ")}
- Vulnerabilities: ${skeletonData.simulation_hooks?.vulnerabilities?.join("; ")}
- Pre-defined Hostile Questions: ${skeletonData.simulation_hooks?.critical_questions?.join("; ")}
`;
  }

  return `You are a university defense jury panel consisting of:
1. Malek (Technical Expert): Focus on system architecture, code efficiency, and tech choices.
2. Souad (Strict Academic): Focus on research methodology, structural compliance, and formal logic.
3. Amir (Business Strategist): Focus on innovation, market value, and scalability.

${skeletonContext}

CRITICAL LANGUAGE RULE: The student has selected ${languageName.toUpperCase()} as the simulation language. You MUST respond ONLY in ${languageName}.

Your task is to manage the conversation. Choose the most appropriate jury member to speak next based on the student's input and project context.

Personality: ${tone}

SPEAKING STYLE — Sound like a real human professor:
- Respond in 60 to 80 words. Be thorough but not verbose.
- Start with a natural conversational reaction (e.g., "Hmm, interesting point...", "D'accord, je vois...", "That's a fair argument, but...", "Bon, merci pour cette explication...").
- Acknowledge what the student said before challenging or asking. Do NOT ignore their answer.
- Use varied sentence structures: mix short observations with a longer follow-up question.
- Ask ONE focused question, but provide context for WHY you're asking (e.g., "I noticed your architecture uses X, which makes me wonder about Y...").
- Occasionally reference what a previous jury member said to create continuity.
- Reference their project specifics (stack, problem, methodology).
- DO NOT provide answers, solutions, or give away information.
- DO NOT use markdown formatting, bullet points, or numbered lists.
- Switch jury members naturally based on the topic (Souad for methodology, Malek for tech, Amir for business/market).

CRITICAL RULES:
- NEVER introduce yourself or say your name. Do NOT start with "I'm Malek" or "As the technical expert". Just speak naturally.
- NEVER repeat a question or topic that was already discussed in the conversation history. Always progress to a NEW aspect of the project. If the student has already answered about X, move on to Y.

OUTPUT FORMAT (strict JSON, no markdown wrapping):
{
  "speaker": "technical" | "academic" | "business",
  "text": "Your response text here..."
}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body: ChatRequest = await request.json();
    const {
      student_message,
      language,
      difficulty,
      conversation_history,
      report_id,
    } = body;

    if (!student_message || !language || !difficulty) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // AI will now decide the speaker
    // const juryMember = selectNextJuryMember(conversation_history);

    // Build conversation context (last 6 messages for context)
    const recentHistory = conversation_history.slice(-6);
    const historyText = recentHistory
      .map((msg) => {
        const speaker =
          msg.speaker === "student"
            ? "Student"
            : (JURY_PROFILES[msg.speaker as keyof typeof JURY_PROFILES]?.name || "Jury Member");
        return `${speaker}: ${msg.text}`;
      })
      .join("\n");

    // Fetch report data if available (for context)
    let reportContext = "";
    let reportData: any = null;
    if (report_id) {
      const { data } = await supabase
        .from("reports")
        .select("title, data")
        .eq("id", report_id)
        .eq("user_id", user.id)
        .single();

      if (data) {
        reportData = data;
        reportContext = `\n\nProject Title: ${reportData.title}`;
      }
    }

    // Build AI prompt
    const systemPrompt = buildSystemPrompt(language, difficulty, reportData?.data);

    const userPrompt = `
Conversation History:
${historyText}

Current Student Input: "${student_message}"

Based on the project's logic chain, technical fingerprint, and vulnerabilities, choose the most appropriate jury member to respond. If it's the start, ask about the problem statement. If deep in, target a vulnerability. 
Return JSON with 'speaker' and 'text'.`;

    // Call Groq API
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
          temperature: 0.6, // Slightly lower for Llama 3 to be more stable
          max_tokens: 1000,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    // Parse AI response robustly
    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("Groq returned empty content", aiData);
      throw new Error("No content received from AI");
    }

    // Strip markdown code blocks if present
    content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    
    // Extract JSON if it's wrapped in text
    const jsonStartIndex = content.indexOf('{');
    const jsonEndIndex = content.lastIndexOf('}');
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      content = content.substring(jsonStartIndex, jsonEndIndex + 1);
    }
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI JSON:", content);
      // Attempt to salvage if it's a simple string wrapped in quotes or something
      // But for now, fallback to a generic response is safer than crashing
      aiResponse = {};
    }

    const juryResponse = aiResponse.text || "I see. Could you elaborate on that?";
    const juryMember = (aiResponse.speaker || "technical") as keyof typeof JURY_PROFILES;
    const expression = aiResponse.expression || (difficulty === "hostile" ? "skeptical" : "serious");

    // Generate TTS audio (COMMENTED OUT AS REQUESTED)
    let audioBase64 = "";
    /*
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
        
        // Map speaker to OpenAI voice
        const voiceMap: Record<string, "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"> = {
          technical: "onyx",
          academic: "nova",
          business: "echo",
        };

        const voice = voiceMap[juryMember] || "alloy";

        const mp3 = await openai.audio.speech.create({
          model: "tts-1",
          voice: voice,
          input: juryResponse,
          speed: 1.0,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        audioBase64 = buffer.toString("base64");
      } catch (ttsError) {
        console.error("TTS generation failed:", ttsError);
        // Continue without audio if TTS fails
      }
    }
    */

    return NextResponse.json({
      success: true,
      jury_response: juryResponse,
      speaker: juryMember,
      audio_base64: audioBase64,
      expression,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate jury response" },
      { status: 500 }
    );
  }
}
