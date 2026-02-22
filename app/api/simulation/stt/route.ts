import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

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

    // Get OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const language = (formData.get("language") as string) || "auto";

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Convert File to format OpenAI expects
    const buffer = await audioFile.arrayBuffer();
    const blob = new Blob([buffer], { type: audioFile.type });
    
    // Create a File object for OpenAI
    const file = new File([blob], audioFile.name || "audio.webm", {
      type: audioFile.type || "audio/webm",
    });

    // Call Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: language === "french" ? "fr" : language === "english" ? "en" : undefined,
      response_format: "text",
    });

    return NextResponse.json({
      success: true,
      transcription: transcription,
    });
  } catch (error: any) {
    console.error("STT API error:", error);
    return NextResponse.json(
      { error: error.message || "Speech-to-text failed" },
      { status: 500 }
    );
  }
}
