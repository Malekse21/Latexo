import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface TranscriptMessage {
  speaker: "student" | "technical" | "academic" | "business";
  text: string;
  timestamp: number;
}

interface EvaluateRequest {
  transcript: TranscriptMessage[];
  report_id: string;
  config: {
    difficulty: string;
    language: string;
  };
}

interface BehavioralStats {
  filler_count: number;
  avg_response_time: number;
  total_duration: number;
}

// ─── French Mention System ───────────────────────────────────
function getMention(score: number): string {
  if (score >= 18) return "Excellent";
  if (score >= 16) return "Très Bien";
  if (score >= 14) return "Bien";
  if (score >= 12) return "Assez Bien";
  if (score >= 10) return "Passable";
  return "Ajourné";
}

// ─── Behavioral Analysis ────────────────────────────────────
function analyzeBehavior(transcript: TranscriptMessage[]): {
  behavioral_stats: BehavioralStats;
  fluency_score: number;
  stress_score: number;
} {
  const hesitationMarkers = [
    "euh", "uhm", "uh", "um", "...",
    "je pense que", "en fait", "donc", "alors",
    "well", "like", "you know",
  ];

  const studentMessages = transcript.filter((msg) => msg.speaker === "student");

  let fillerCount = 0;
  studentMessages.forEach((msg) => {
    const textLower = msg.text.toLowerCase();
    hesitationMarkers.forEach((marker) => {
      const regex = new RegExp(`\\b${marker}\\b`, "gi");
      const matches = textLower.match(regex);
      if (matches) fillerCount += matches.length;
    });
  });

  const fluencyScore = Math.max(0, Math.min(100, 100 - fillerCount * 5));

  const responseTimes: number[] = [];
  for (let i = 0; i < transcript.length - 1; i++) {
    const current = transcript[i];
    const next = transcript[i + 1];
    if (
      (current.speaker === "technical" ||
        current.speaker === "academic" ||
        current.speaker === "business") &&
      next.speaker === "student"
    ) {
      responseTimes.push(next.timestamp - current.timestamp);
    }
  }

  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 1000
      : 0;

  let stressScore = 0;
  if (avgResponseTime <= 2) {
    stressScore = (avgResponseTime / 2) * 20;
  } else if (avgResponseTime <= 4) {
    stressScore = 20 + ((avgResponseTime - 2) / 2) * 30;
  } else if (avgResponseTime <= 6) {
    stressScore = 50 + ((avgResponseTime - 4) / 2) * 30;
  } else {
    stressScore = Math.min(100, 80 + (avgResponseTime - 6) * 5);
  }

  const totalDuration =
    transcript.length > 0
      ? transcript[transcript.length - 1].timestamp - transcript[0].timestamp
      : 0;

  return {
    behavioral_stats: {
      filler_count: fillerCount,
      avg_response_time: Math.round(avgResponseTime * 10) / 10,
      total_duration: Math.round(totalDuration / 1000),
    },
    fluency_score: Math.round(fluencyScore),
    stress_score: Math.round(stressScore),
  };
}

// ─── Groq Evaluator ─────────────────────────────────────────
async function runEvaluation(
  transcript: TranscriptMessage[],
  reportData: any,
  memoryData: any,
  language: string
): Promise<{
  score: number;
  proficiency: { tech: number; acad: number; biz: number };
  sticker: string;
  jury_feedback: {
    tech: { comment: string; tip: string };
    strict: { comment: string; tip: string };
    business: { comment: string; tip: string };
  };
  memory_update: string;
}> {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const transcriptText = transcript
    .map((msg) => `${msg.speaker.toUpperCase()}: ${msg.text}`)
    .join("\n");

  const skeletonData = reportData?.data || {};
  const pastMemory = memoryData || {};

  const systemPrompt = `Act as the Latexo Evaluation Engine. Review the transcript of the defense.

Inputs:
PFE JSON: ${JSON.stringify(skeletonData, null, 2)}
Memory JSON: ${JSON.stringify(pastMemory)}
Transcript: 
${transcriptText}

Tasks:
1. Grade: Assign a final grade out of 20.0 (one decimal place).
2. 3-Axis Proficiency: Score Technical, Academic, and Business performance (0-100 each).
3. Persona Critique: Provide 1 "Comment" (What they did) and 1 "Tip" (How to fix it) for each of the 3 Jurors:
   - Technical Expert (tech)
   - Strict Academic (strict)
   - Business Strategist (business)
4. Sticker Roast: Generate a funny 4-word roast in Tunisian Derja (Latin script). Make it playful and culturally relevant.
5. Memory Compact: Write a 2-sentence note for the next simulation about what the student still hasn't mastered.

Defense Language: ${language}

Output Format (Strict JSON only, no markdown, no explanation):
{
  "score": 14.5,
  "proficiency": { "tech": 80, "acad": 60, "biz": 90 },
  "sticker": "...",
  "jury_feedback": {
    "tech": { "comment": "...", "tip": "..." },
    "strict": { "comment": "...", "tip": "..." },
    "business": { "comment": "...", "tip": "..." }
  },
  "memory_update": "..."
}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Evaluate the defense and return the JSON." },
      ],
      temperature: 0.5,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from Groq");
  }

  // Strip markdown if present
  content = content.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  const jsonStart = content.indexOf("{");
  const jsonEnd = content.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1) {
    content = content.substring(jsonStart, jsonEnd + 1);
  }

  const parsed = JSON.parse(content);

  return {
    score: Math.max(0, Math.min(20, parsed.score || 10)),
    proficiency: {
      tech: Math.max(0, Math.min(100, parsed.proficiency?.tech || 50)),
      acad: Math.max(0, Math.min(100, parsed.proficiency?.acad || 50)),
      biz: Math.max(0, Math.min(100, parsed.proficiency?.biz || 50)),
    },
    sticker: parsed.sticker || "Ma3andekch niveau",
    jury_feedback: {
      tech: {
        comment: parsed.jury_feedback?.tech?.comment || "No comment available.",
        tip: parsed.jury_feedback?.tech?.tip || "No tip available.",
      },
      strict: {
        comment: parsed.jury_feedback?.strict?.comment || "No comment available.",
        tip: parsed.jury_feedback?.strict?.tip || "No tip available.",
      },
      business: {
        comment: parsed.jury_feedback?.business?.comment || "No comment available.",
        tip: parsed.jury_feedback?.business?.tip || "No tip available.",
      },
    },
    memory_update: parsed.memory_update || "No memory update generated.",
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: EvaluateRequest = await request.json();
    const { transcript, report_id, config } = body;

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json(
        { error: "Invalid transcript data" },
        { status: 400 }
      );
    }

    if (!report_id) {
      return NextResponse.json(
        { error: "Missing report_id" },
        { status: 400 }
      );
    }

    // Fetch report data
    const { data: reportData, error: reportError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", report_id)
      .eq("user_id", user.id)
      .single();

    if (reportError || !reportData) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    // Fetch student memory from profiles
    const { data: profileData } = await supabase
      .from("profiles")
      .select("memory")
      .eq("id", user.id)
      .single();

    const pastMemory = profileData?.memory || {};

    // Step 1: Behavioral Analysis (local — no API call)
    const { behavioral_stats, fluency_score, stress_score } =
      analyzeBehavior(transcript);

    // Step 2: AI Evaluation via Groq
    const evaluation = await runEvaluation(
      transcript,
      reportData,
      pastMemory,
      config.language
    );

    // Step 3: Compute mention
    const mention = getMention(evaluation.score);

    // Step 4: Build combined metrics (for backward compat)
    const metrics = {
      technical: evaluation.proficiency.tech,
      academic: evaluation.proficiency.acad,
      market: evaluation.proficiency.biz,
      fluency: fluency_score,
      stress: stress_score,
    };

    const weightedScore =
      metrics.technical * 0.4 +
      metrics.academic * 0.3 +
      metrics.market * 0.2 +
      metrics.fluency * 0.1;
    const calculatedGrade = Math.round((weightedScore / 100) * 20 * 10) / 10;

    // Use AI score as primary, keep calculated as fallback
    const final_grade = evaluation.score || calculatedGrade;

    // Step 5: Save to database
    const { data: simulation, error: insertError } = await supabase
      .from("simulations")
      .insert({
        report_id,
        user_id: user.id,
        final_grade,
        mention,
        metrics,
        behavioral_stats,
        jury_feedback: {
          // Legacy format (backward compat)
          tech_quote: evaluation.jury_feedback.tech.comment,
          strict_quote: evaluation.jury_feedback.strict.comment,
          business_quote: evaluation.jury_feedback.business.comment,
        },
        transcript,
        // New columns
        evaluation: {
          score: evaluation.score,
          proficiency: evaluation.proficiency,
        },
        feedback: evaluation.jury_feedback,
        sticker_caption: evaluation.sticker,
        memory_snapshot: evaluation.memory_update,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save simulation results" },
        { status: 500 }
      );
    }

    // Step 6: Update student memory on profile
    const updatedMemory = {
      ...pastMemory,
      last_session: new Date().toISOString(),
      last_note: evaluation.memory_update,
      session_count: (pastMemory.session_count || 0) + 1,
    };

    await supabase
      .from("profiles")
      .update({ memory: updatedMemory })
      .eq("id", user.id);

    return NextResponse.json({
      success: true,
      simulation_id: simulation.id,
      final_grade,
      mention,
      metrics,
      behavioral_stats,
      evaluation: {
        score: evaluation.score,
        proficiency: evaluation.proficiency,
      },
      feedback: evaluation.jury_feedback,
      sticker_caption: evaluation.sticker,
      memory_update: evaluation.memory_update,
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
