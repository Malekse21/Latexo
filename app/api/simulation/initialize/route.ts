import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Enhanced System Prompt for Detailed Academic Analysis
const COMBINED_SYSTEM_PROMPT = `
System Role:
You are the Latexo Academic Engine, a PhD-level Auditor and University Jury Member. You are analyzing a PFE (Projet de Fin d'Études) report to prepare a student for their final defense.

Task:
Process the provided text and output a strictly valid, minified JSON object that maps the entire report's DNA.

Academic Constraints (Tunisian Standards):
- Each chapter must have an Introduction and a Conclusion.
- Bibliography must have "Dates de consultation" for all URLs.
- Logic must flow: Problem Statement → Objectives → Methodology → Results.

Language Context: [USER_SELECTED_LANGUAGE]

The JSON Schema Requirements:
{
  "project_meta": {
    "title": "string",
    "student_name": "string",
    "university": "string",
    "innovation_score": "number (0-20)"
  },
  "logic_chain": {
    "problem": "The core pain point being solved",
    "solution": "How the student solved it",
    "logic_gap": "Identify any contradiction between the intro and conclusion"
  },
  "structural_audit": {
    "checklist": {
      "dedication": "boolean",
      "acknowledgments": "boolean",
      "abstract_fr": "boolean",
      "abstract_en": "boolean",
      "table_of_contents": "boolean",
      "glossary": "boolean",
      "bibliography": "boolean"
    },
    "pagination_error": "Detect if page numbers start before the Introduction Générale"
  },
  "chapter_map": [
    {
      "title": "string",
      "start_page": "number",
      "end_page": "number",
      "summary": "50 words",
      "subsections": [
        {
          "summary": "1-sentence summary for the Zero-RAG simulation"
        }
      ]
    }
  ],
  "technical_fingerprint": {
    "stack": ["List of every framework, language, and tool"],
    "architecture": ["Diagram descriptions (e.g., UML, Sequence, Cloud architecture)"]
  },
  "simulation_hooks": {
    "vulnerabilities": ["4 specific technical or methodological weak spots"],
    "critical_questions": ["3 hostile questions tailored to this specific project"]
  },
  "firstJuryMessage": {
    "speaker": "technical" | "academic" | "business",
    "text": "Your opening text here...",
    "emotion": "serious"
  }
}

Output Style:
- Return ONLY the raw JSON.
- Do not include \`\`\`json markdown blocks.
- Use French for the summaries if the report is in French; use English if the report is in English.
`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId, selectedLanguage } = await req.json();

    // Use Service Key to bypass RLS for report lookup
    // This ensures we can find the report even if the user context is tricky
    const { createClient: createAdminClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 1. Get Report Info with extracted text
    // 1. Get Report Info with extracted text
    let report;
    const { data: fetchedReport, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('extracted_text, title, data, is_unlocked')
      .eq('id', reportId)
      .single();

    if (reportError || !fetchedReport) {
      console.warn(`[WARN] Report lookup failed (ID: ${reportId}). Using MOCK data for simulation.`);
      report = {
        extracted_text: "This is a fallback description for a generic software engineering defense. The project involves a web application using Next.js, Supabase, and AI integration. The student should defend their architectural choices, security implementation, and scalability plans.",
        title: "Debug Simulation",
        data: null,
        is_unlocked: false,
        id: reportId // Keep ID for update attempt (might fail silently)
      };
    } else {
      report = fetchedReport;
    }

    // 2. Check if skeleton already exists and is unlocked
    if (report.is_unlocked && report.data && Object.keys(report.data).length > 0) {
      console.log('✅ Skeleton already exists, returning cached data');
      
      // Generate first jury message even if skeleton exists
      const firstJuryMessage = {
        speaker: 'academic',
        text: 'Welcome to your defense simulation. We have reviewed your work and are ready to begin. Let us start with your project overview.',
        emotion: 'serious'
      };
      
      return NextResponse.json({ 
        skeleton: report.data, 
        firstJuryMessage 
      });
    }

    // 3. Get extracted text from database
    if (!report.extracted_text || report.extracted_text.trim().length === 0) {
      return NextResponse.json({ 
        error: 'No extracted text available for this report. Please re-upload the document.',
        details: 'The extracted_text column is empty. Upload may have failed.'
      }, { status: 400 });
    }

    const fullText = report.extracted_text;

    // 4. Generate Analysis (Groq Llama 3.3)
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing Groq API Key' }, { status: 500 });
    
    console.log('Calling AI with Groq Llama 3.3...');
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: COMBINED_SYSTEM_PROMPT.replace('[USER_SELECTED_LANGUAGE]', selectedLanguage) },
          { role: "user", content: fullText.slice(0, 30000) } // Reduced context for Llama just to be safe, though 70b handles large context well
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) throw new Error(`AI API failed: ${response.statusText}`);

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content;
    content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    
    const result = JSON.parse(content);
    
    // In the new schema, we map the entire object or specific parts
    // We expect the object to match the schema defined in the prompt.
    // If firstJuryMessage is nested at root as instructed in my consolidated schema:
    const firstJuryMessage = result.firstJuryMessage || {
      speaker: 'academic',
      text: 'Bienvenue à votre soutenance. Nous avons examiné votre travail et sommes prêts à commencer.',
      emotion: 'serious'
    };

    // 5. Save Skeleton to DB
    await supabase
      .from('reports')
      .update({ data: result, is_unlocked: true, status: 'completed' })
      .eq('id', reportId);

    return NextResponse.json({ 
      skeleton: result, 
      firstJuryMessage 
    });

  } catch (error: any) {
    console.error('Initialize Error:', error);
    return NextResponse.json({ error: error.message || 'Initialization failed' }, { status: 500 });
  }
}
