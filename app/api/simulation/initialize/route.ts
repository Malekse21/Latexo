import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Enhanced System Prompt for Detailed PFE Academic Analysis
const COMBINED_SYSTEM_PROMPT = `
System Role:
You are the Latexo Academic Engine, a PhD-level Auditor specialized in Tunisian PFE (Projet de Fin d'Études) reports. You are analyzing a student's report to map its complete DNA.

Task:
Process the provided text and output a strictly valid, minified JSON object that maps the entire report's structure across its 4 standard chapters.

Language Context: [USER_SELECTED_LANGUAGE]

The JSON Schema Requirements:
{
  "project_meta": {
    "title": "string - exact project title",
    "host_organization": {
      "name": "string - company or institution name",
      "activities": ["string - list of what the organization does"]
    },
    "methodology": "string - e.g. Agile SCRUM, V-model, etc."
  },
  "chapter_1_context_and_problem": {
    "existing_solutions": ["string - list of current tools/systems that exist before this project"],
    "critique_of_existing": ["string - specific weaknesses and flaws of those existing solutions"],
    "core_problem": "string - the detailed problem statement the student is solving",
    "proposed_solution": "string - the specific solution the student proposes"
  },
  "chapter_2_requirements": {
    "actors": [
      { "role": "string - e.g. Admin, User, etc.", "description": "string - what this actor does in the system" }
    ],
    "functional_requirements": ["string - high-level list of features and capabilities"],
    "non_functional_requirements": {
      "performance": "string",
      "security": "string",
      "ergonomics": "string"
    },
    "uml_use_cases": ["string - core use cases that were modeled"]
  },
  "chapter_3_conceptual_study": {
    "dynamic_view_sequence_diagrams": ["string - key workflows modeled as sequence diagrams"],
    "static_view_class_diagram": ["string - primary entities and classes from the class diagram"],
    "overall_architecture": "string - MVC, 3-Tier, Microservices, Client-Server, etc."
  },
  "chapter_4_realization": {
    "development_environment": {
      "frontend_stack": ["string - frameworks and libraries used for the frontend"],
      "backend_stack": ["string - frameworks and libraries used for the backend"],
      "database": "string - database technology used",
      "ides_and_tools": ["string - IDEs, version control, deployment tools"]
    },
    "hardware_environment": "string - server specs, IoT devices, or deployment infrastructure",
    "developed_interfaces": ["string - list of the main UI screens or pages created"]
  }
}

Output Style:
- Return ONLY the raw JSON.
- Do not include \`\`\`json markdown blocks.
- Use French for the summaries if the report is in French; use English if the report is in English.
- Be as exhaustive as possible. Extract every detail you can find for each field.
- If a field cannot be determined from the text, use "Not specified" instead of omitting it.
`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId, selectedLanguage, difficulty } = await req.json();

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

    // Groq API Key — needed for both Vengeance greeting and DNA generation
    const apiKey = process.env.GROQ_API_KEY;

    // 2. Check if skeleton already exists and is unlocked
    if (report.is_unlocked && report.data && Object.keys(report.data).length > 0) {
      console.log('✅ Skeleton already exists, returning cached data');

      // Count the student's past simulations for session-aware greeting
      const { count: sessionCount } = await supabase
        .from('simulations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const attemptNumber = (sessionCount ?? 0) + 1; // current attempt
      
      // Generate first jury message — Vengeance or Standard
      let firstJuryMessage;

      if (difficulty === 'hostile') {
        // Fetch student memory for vengeance
        const { data: profileData } = await supabase
          .from('profiles')
          .select('memory')
          .eq('id', user.id)
          .single();

        const lastNote = profileData?.memory?.last_note;

        if (lastNote && apiKey) {
          try {
            const vengRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
              body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                  { role: "system", content: `You are a strict academic jury president. The student is back for another defense attempt (this is attempt #${attemptNumber}). In their previous session, the evaluation noted: "${lastNote}". Welcome them back, but immediately reference this past weakness. Tell them you hope they studied it this time. Respond in ${selectedLanguage === 'french' ? 'French' : 'English'}. Keep it under 2 sentences. Be serious but not rude. Only rarely mention the attempt number — focus on the weakness instead.` },
                  { role: "user", content: "Generate the opening greeting." }
                ],
                temperature: 0.7,
                max_tokens: 150
              })
            });
            const vengData = await vengRes.json();
            const vengText = vengData.choices?.[0]?.message?.content?.trim();
            if (vengText) {
              firstJuryMessage = { speaker: 'academic', text: vengText, emotion: 'serious' };
            }
          } catch (e) {
            console.error('Vengeance greeting failed, using default:', e);
          }
        }
      }

      // Fallback to standard greeting — session-aware, no "give us an overview" (first dynamic question handles that)
      if (!firstJuryMessage) {
        const isReturning = attemptNumber > 1;
        firstJuryMessage = {
          speaker: 'academic',
          text: selectedLanguage === 'french'
            ? isReturning
              ? 'Bon retour. Le jury a pris connaissance de votre travail. Nous allons commencer.'
              : 'Bienvenue à votre soutenance. Nous avons examiné votre travail et sommes prêts à commencer.'
            : isReturning
              ? 'Welcome back. The jury has reviewed your work. Let\'s begin.'
              : 'Welcome to your defense. We have reviewed your work and are ready to begin.',
          emotion: 'serious'
        };
      }
      
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

    // 4. Smart Context: Head & Tail trick for long reports
    const MAX_CHARS = 30000;
    let optimizedContext = fullText;

    if (fullText.length > MAX_CHARS) {
      const head = fullText.substring(0, 15000);
      const tail = fullText.substring(fullText.length - 15000);
      optimizedContext = head + "\n\n... [MIDDLE SECTIONS OMITTED FOR BREVITY] ...\n\n" + tail;
      console.log(`Report too long (${fullText.length} chars), using Head & Tail: ${optimizedContext.length} chars`);
    }

    // 5. Generate Analysis (Groq Llama 3.3)
    if (!apiKey) return NextResponse.json({ error: 'Missing Groq API Key' }, { status: 500 });
    
    console.log(`Calling AI with Groq Llama 3.3 (${optimizedContext.length} chars)...`);
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
          { role: "user", content: optimizedContext }
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
    
    // Count the student's past simulations for session-aware greeting
    const { count: sessionCount } = await supabase
      .from('simulations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const attemptNumber = (sessionCount ?? 0) + 1;

    // Generate the first jury greeting — Vengeance or Standard
    let firstJuryMessage;

    if (difficulty === 'hostile') {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('memory')
        .eq('id', user.id)
        .single();

      const lastNote = profileData?.memory?.last_note;

      if (lastNote) {
        try {
          const vengRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: `You are a strict academic jury president. The student is back for another defense attempt (this is attempt #${attemptNumber}). In their previous session, the evaluation noted: "${lastNote}". Welcome them back, but immediately reference this past weakness. Tell them you hope they studied it this time. Respond in ${selectedLanguage === 'french' ? 'French' : 'English'}. Keep it under 2 sentences. Be serious but not rude. Only rarely mention the attempt number — focus on the weakness instead.` },
                { role: "user", content: "Generate the opening greeting." }
              ],
              temperature: 0.7,
              max_tokens: 150
            })
          });
          const vengData = await vengRes.json();
          const vengText = vengData.choices?.[0]?.message?.content?.trim();
          if (vengText) {
            firstJuryMessage = { speaker: 'academic', text: vengText, emotion: 'serious' };
          }
        } catch (e) {
          console.error('Vengeance greeting failed, using default:', e);
        }
      }
    }

    // Fallback to standard greeting — session-aware, no "give us an overview"
    if (!firstJuryMessage) {
      const isReturning = attemptNumber > 1;
      firstJuryMessage = {
        speaker: 'academic',
        text: selectedLanguage === 'french'
          ? isReturning
            ? 'Bon retour. Le jury a pris connaissance de votre travail. Nous allons commencer.'
            : 'Bienvenue à votre soutenance. Nous avons examiné votre travail et sommes prêts à commencer.'
          : isReturning
            ? 'Welcome back. The jury has reviewed your work. Let\'s begin.'
            : 'Welcome to your defense. We have reviewed your work and are ready to begin.',
        emotion: 'serious'
      };
    }

    // 6. Save Skeleton to DB
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
