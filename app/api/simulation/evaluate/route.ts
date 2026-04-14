import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logGroqCost } from "@/src/config/groq";
import { getSession, deleteSession } from "@/src/lib/session/state";

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
    durationMinutes: number;
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

// Removed local analyzeBehavior function to rely purely on AI grading
async function runEvaluation(
  transcript: TranscriptMessage[],
  reportData: any,
  memoryData: any,
  language: string
): Promise<{
  score: number;
  proficiency: { tech: number; acad: number; biz: number };
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

  const pastMemory = memoryData || {};

  const systemPrompt = `Act as the Latexo Evaluation Engine. Review the transcript of the defense.

Inputs:
Memory JSON: ${JSON.stringify(pastMemory)}
Transcript: 
${transcriptText}

## CRITICAL GRADING RULES (MUST FOLLOW):
- If the student barely spoke, gave only one-word answers, or remained completely silent, you MUST assign a FAILING grade (0-4 out of 20) and set ALL proficiency scores below 10. Do NOT give them the benefit of the doubt.
- The grade must be proportional to the QUALITY and DEPTH of the student's actual spoken answers. If the student uses generic buzzwords without deep technical or business justification, severely penalize their score.
- A student who does not defend their work deserves 0-2/20. A student who gives shallow, surface-level answers deserves 3-8/20.
- Mediocre or merely "okay" answers without strong argumentation should be graded strictly around 9-11/20.
- Only exceptional, highly detailed answers that prove mastery of the subject matter merit a grade of 14+/20. Do NOT hand out high grades easily.

Tasks:
1. Grade: Assign a final grade out of 20.0 (one decimal place). Be strict and fair.
2. 3-Axis Proficiency: Score Technical, Academic, and Business performance (0-100 each).
3. Persona Critique: Provide 1 specific "Comment" (What they did) and 1 actionable "Tip" (How to fix it) for each Juror.
4. Memory Compact: Write a 2-sentence note tracking what the student must improve next time.

Defense Language: ${language}

Output Format (Strict JSON only, no markdown, no explanation):
{
  "score": <number 0-20>,
  "proficiency": { "tech": <0-100>, "acad": <0-100>, "biz": <0-100> },
  "jury_feedback": {
    "tech": { "comment": "...", "tip": "..." },
    "academic": { "comment": "...", "tip": "..." },
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
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content;
  
  if (data.usage) {
    logGroqCost("Session Evaluation", data.usage.prompt_tokens, data.usage.completion_tokens, "llama-3.3-70b-versatile");
  }

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
    score: Math.max(0, Math.min(20, parsed.score ?? 0)),
    proficiency: {
      tech: Math.max(0, Math.min(100, parsed.proficiency?.tech ?? 0)),
      acad: Math.max(0, Math.min(100, parsed.proficiency?.acad ?? 0)),
      biz: Math.max(0, Math.min(100, parsed.proficiency?.biz ?? 0)),
    },
    jury_feedback: {
      tech: {
        comment: parsed.jury_feedback?.tech?.comment || "No comment available.",
        tip: parsed.jury_feedback?.tech?.tip || "No tip available.",
      },
      strict: {
        comment: parsed.jury_feedback?.academic?.comment || parsed.jury_feedback?.strict?.comment || "No comment available.",
        tip: parsed.jury_feedback?.academic?.tip || parsed.jury_feedback?.strict?.tip || "No tip available.",
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

    // Fetch student memory and stats from profiles
    const { data: profileData } = await supabase
      .from("profiles")
      .select("memory, total_sessions, best_score, total_time_minutes, current_streak, longest_streak, last_session")
      .eq("id", user.id)
      .single();

    const pastMemory = profileData?.memory || {};
    const currentTotalSessions = profileData?.total_sessions || 0;
    const currentBestScore = profileData?.best_score || 0;
    // Fetch the live session to get the simulation ID created at session start
    const liveSession = await getSession(user.id);
    const simulationId = liveSession?.sessionId;

    if (!simulationId) {
      console.error("No live session found for user:", user.id);
      return NextResponse.json(
        { error: "No active simulation session found" },
        { status: 404 }
      );
    }

    // Step 1: AI Evaluation via Groq
    const evaluation = await runEvaluation(
      transcript,
      reportData,
      pastMemory,
      config.language
    );

    // Step 2: Compute mention
    const mention = getMention(evaluation.score);

    const final_grade = evaluation.score;

    // Step 3: Update the existing IN_PROGRESS simulation row with results
    const { data: simulation, error: updateError } = await supabase
      .from("simulations")
      .update({
        final_grade,
        mention,
        status: "COMPLETED",
        evaluation: {
          score: evaluation.score,
          proficiency: evaluation.proficiency,
        },
        jury_feedback: evaluation.jury_feedback,
        feedback: evaluation.jury_feedback,
        transcript,
        memory_snapshot: evaluation.memory_update,
      })
      .eq("id", simulationId)
      .select()
      .single();

    if (updateError) {
      console.error("Database update error:", updateError);
      return NextResponse.json(
        { error: "Failed to save simulation results" },
        { status: 500 }
      );
    }

    // Step 6: Update profile — dedicated columns + lean memory
    const updatedMemory = {
      ...pastMemory,
      last_note: evaluation.memory_update,
    };
    // Remove legacy duplicates from memory blob
    delete updatedMemory.last_session;
    delete updatedMemory.session_count;
    delete updatedMemory.highest_score;

    // Step 6b: Calculate streak
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    let currentStreak = profileData?.current_streak || 0;
    let longestStreak = profileData?.longest_streak || 0;
    const lastSessionDate = profileData?.last_session ? new Date(profileData.last_session) : null;

    if (lastSessionDate) {
      const lastUTC = new Date(Date.UTC(lastSessionDate.getUTCFullYear(), lastSessionDate.getUTCMonth(), lastSessionDate.getUTCDate()));
      const diffDays = Math.floor((todayUTC.getTime() - lastUTC.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Already practiced today — streak stays the same
      } else if (diffDays === 1) {
        // Consecutive day — increment streak
        currentStreak += 1;
      } else {
        // Missed a day — reset streak
        currentStreak = 1;
      }
    } else {
      // First ever session
      currentStreak = 1;
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    await supabase
      .from("profiles")
      .update({
        memory: updatedMemory,
        total_sessions: currentTotalSessions + 1,
        total_time_minutes: (profileData?.total_time_minutes || 0) + (config.durationMinutes || 0),
        best_score: Math.max(currentBestScore, final_grade),
        last_session: new Date().toISOString(),
        current_streak: currentStreak,
        longest_streak: longestStreak,
      })
      .eq("id", user.id);

    // Step 5: Save asked questions to report for cross-simulation continuity
    try {
      if (liveSession && liveSession.questionsAskedTexts?.length > 0) {
        // Fetch current past_questions from the report
        const { data: reportForHistory } = await supabase
          .from("reports")
          .select("past_questions")
          .eq("id", report_id)
          .single();

        const existingPastQuestions: string[] = reportForHistory?.past_questions || [];
        const combined = [...existingPastQuestions, ...liveSession.questionsAskedTexts];
        // Keep only the last 60 questions to avoid prompt bloat
        const trimmed = combined.slice(-60);

        await supabase
          .from("reports")
          .update({ past_questions: trimmed })
          .eq("id", report_id);
      }

      // Clean up live session
      await deleteSession(user.id);

      // --- PRUNING LOGIC: Keep only the 3 most recent simulations ---
      const { data: allSims } = await supabase
        .from("simulations")
        .select("id")
        .eq("user_id", user.id)
        .eq("report_id", report_id)
        .order("created_at", { ascending: false });

      if (allSims && allSims.length > 3) {
        const idsToDelete = allSims.slice(3).map((s) => s.id);
        
        const { error: deleteError } = await supabase
          .from("simulations")
          .delete()
          .in("id", idsToDelete);
          
        if (deleteError) {
          console.error("Failed to prune old simulations:", deleteError);
        } else {
          console.log(`Pruned ${idsToDelete.length} old simulations for user ${user.id}.`);
        }
      }
      // --------------------------------------------------------------

    } catch (cleanupErr) {
      console.error("Failed to cleanup session or save history:", cleanupErr);
      // Non-fatal — don't block the response
    }

    return NextResponse.json({
      success: true,
      simulation_id: simulation.id,
      final_grade,
      mention,
      evaluation: {
        score: evaluation.score,
        proficiency: evaluation.proficiency,
      },
      feedback: evaluation.jury_feedback,
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
