import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ClosingRequest {
  language: "french" | "english" | "mixed";
  conversation_history: { speaker: string; text: string }[];
  report_id?: string;
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

    const body: ClosingRequest = await request.json();
    const { language, conversation_history, report_id } = body;

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Groq API key not configured" },
        { status: 500 }
      );
    }

    const languageName = language === "french" ? "French" : "English";

    // Fetch report title for context
    let projectTitle = "the project";
    if (report_id) {
      const { data } = await supabase
        .from("reports")
        .select("title")
        .eq("id", report_id)
        .eq("user_id", user.id)
        .single();
      if (data?.title) projectTitle = data.title;
    }

    const recentHistory = conversation_history
      .slice(-4)
      .map((msg) => `${msg.speaker.toUpperCase()}: ${msg.text}`)
      .join("\n");

    const systemPrompt = `You are a university defense jury panel wrapping up a defense session for "${projectTitle}".

LANGUAGE RULE: You MUST respond ONLY in ${languageName}.

The defense time is over. Generate a brief, natural closing remark from ONE jury member. This should:
- Thank the student for their presentation
- Reference something specific from the recent conversation
- Sound warm but professional, like a real professor wrapping up
- Be 30-50 words maximum
- NEVER say a jury member's name

Recent conversation:
${recentHistory}

OUTPUT FORMAT (strict JSON, no markdown):
{
  "speaker": "technical" | "academic" | "business",
  "text": "Your closing remark here..."
}`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Generate the closing remark." },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content from Groq");
    }

    // Parse JSON
    content = content.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      content = content.substring(jsonStart, jsonEnd + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        speaker: "academic",
        text:
          language === "french"
            ? "Merci pour votre présentation. Le jury va maintenant délibérer."
            : "Thank you for your presentation. The jury will now deliberate.",
      };
    }

    return NextResponse.json({
      success: true,
      speaker: parsed.speaker || "academic",
      text: parsed.text || "Thank you for your presentation.",
    });
  } catch (error) {
    console.error("Closing remarks error:", error);
    return NextResponse.json(
      {
        success: true,
        speaker: "academic",
        text: "Thank you for your defense. The jury will now deliberate.",
      }
    );
  }
}
