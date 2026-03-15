import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const language = formData.get("language") as string;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 });
    }

    // Prepare FormData for Groq
    const groqFormData = new FormData();
    groqFormData.append("file", file);
    groqFormData.append("model", "whisper-large-v3-turbo");
    
    // Optional: guide the model to the correct language if known
    if (language === 'french') {
      groqFormData.append("language", "fr");
    } else if (language === 'english') {
      groqFormData.append("language", "en");
    }

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: groqFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Groq Whisper API Error:", errorData);
      throw new Error(errorData.error?.message || `Whisper API failed with status ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({ text: data.text });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
