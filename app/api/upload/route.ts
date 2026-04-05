import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Strips boilerplate pages (cover, acknowledgments, TOC, list of figures)
 * from extracted PFE text. Keeps only the real content between
 * "Introduction générale" / "Chapitre 1" and "Conclusion générale" / "Bibliographie".
 */
function cleanBoilerplate(raw: string): string {
  let text = raw;

  // ── Find the start of actual content ──
  const startPatterns = [
    /introduction\s+g[eé]n[eé]rale/i,
    /chapitre\s+1/i,
    /pr[eé]sentation\s+du\s+projet/i,
  ];

  let startIndex = -1;
  for (const pattern of startPatterns) {
    const match = text.search(pattern);
    if (match !== -1) {
      startIndex = match;
      break;
    }
  }

  // ── Find the end of actual content ──
  const endPatterns = [
    /bibliographie/i,
    /webographie/i,
    /r[eé]f[eé]rences/i,
    /annexe/i,
  ];

  let endIndex = -1;
  for (const pattern of endPatterns) {
    const match = text.search(pattern);
    if (match !== -1) {
      endIndex = match;
      break;
    }
  }

  // Slice
  if (startIndex > 0) {
    text = text.substring(startIndex);
  }
  if (endIndex > startIndex) {
    // Keep some chars after the end anchor to capture the conclusion text
    const adjustedEnd = (endIndex - (startIndex > 0 ? startIndex : 0)) + 3000;
    text = text.substring(0, Math.min(adjustedEnd, text.length));
  }

  return text.trim();
}

/**
 * Simple non-AI language detection based on common word frequency
 */
function detectLanguage(text: string): "french" | "english" {
  const sample = text.toLowerCase().slice(0, 10000);
  const frenchWords = [" le ", " la ", " les ", " et ", " est ", " pour ", " dans "];
  const englishWords = [" the ", " and ", " is ", " for ", " with ", " that ", " this "];
  
  let frenchCount = 0;
  let englishCount = 0;
  
  frenchWords.forEach(word => {
    const matches = sample.match(new RegExp(word, 'g'));
    if (matches) frenchCount += matches.length;
  });
  
  englishWords.forEach(word => {
    const matches = sample.match(new RegExp(word, 'g'));
    if (matches) englishCount += matches.length;
  });
  
  return frenchCount >= englishCount ? "french" : "english";
}

// ── API Route ────────────────────────────────────────────────
// The client now handles:
//   1. File validation (type, size, page count)
//   2. Text extraction (pdfjs-dist / mammoth in the browser)
//   3. Thumbnail generation
//   4. Direct upload to Supabase Storage
//
// This endpoint only receives lightweight JSON metadata and writes to the DB.

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const {
      fileName,
      filePath,
      thumbnailUrl,
      pageCount,
      wordCount,
      sizeBytes,
      extractedText,
      fileType,
      confirmDeletion,
    } = body as {
      fileName: string;
      filePath: string;
      thumbnailUrl: string | null;
      pageCount: number;
      wordCount: number;
      sizeBytes: number;
      extractedText: string;
      fileType: "pdf" | "docx";
      confirmDeletion?: boolean;
    };

    if (!fileName || !filePath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ── Handle One-Report Policy Updates ──
    let existingReportId: string | null = null;
    if (confirmDeletion) {
      console.log(`Updating existing report files for user ${user.id} before new upload...`);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_report_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.active_report_id) {
        const { data: existingReport } = await supabase
          .from('reports')
          .select('id, file_path, thumbnail_url')
          .eq('id', profile.active_report_id)
          .single();
          
        if (existingReport) {
          existingReportId = existingReport.id;
          
          // Remove old files from storage, DO NOT delete DB row
          if (existingReport.file_path) {
            const { error: pdfError } = await supabase.storage
              .from('pfes')
              .remove([existingReport.file_path]);
            if (pdfError) console.error("Error deleting old PDF:", pdfError);
          }
          if (existingReport.thumbnail_url) {
            try {
              const urlParts = existingReport.thumbnail_url.split('/');
              const thumbFileName = urlParts[urlParts.length - 1];
              const thumbPath = `${user.id}/${thumbFileName}`;
              const { error: thumbError } = await supabase.storage
                .from('thumbnails')
                .remove([thumbPath]);
              if (thumbError) console.error("Error deleting old thumbnail:", thumbError);
            } catch(e) {}
          }
        }
      }
    }

    // ── Clean + Detect Language ──
    const cleanedText = cleanBoilerplate(extractedText || "").trim();
    const detectedLang = detectLanguage(extractedText || "");

    console.log(`Received ${(extractedText || "").length} chars for ${fileName}. Language: ${detectedLang}`);

    // ── Build clean title ──
    const cleanTitle = fileName
      .replace(/\.(pdf|docx)$/i, '')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ');

    // ── Save to Database ──
    const reportDataPayload = {
      user_id: user.id,
      title: cleanTitle,
      name: cleanTitle,
      file_path: filePath,
      thumbnail_url: thumbnailUrl,
      page_count: pageCount || 0,
      word_count: wordCount || 0,
      size_bytes: sizeBytes || 0,
      status: 'completed', 
      data: {},
      detected_language: detectedLang,
      extracted_text: cleanedText,
    };

    let report;
    let dbError;

    if (existingReportId) {
      // Update existing report to preserve simulations
      const res = await supabase
        .from('reports')
        .update(reportDataPayload)
        .eq('id', existingReportId)
        .select()
        .single();
      report = res.data;
      dbError = res.error;
    } else {
      // Insert new report
      const res = await supabase
        .from('reports')
        .insert(reportDataPayload)
        .select()
        .single();
      report = res.data;
      dbError = res.error;
    }

    if (dbError) {
      throw new Error(`Database Insert/Update failed: ${dbError.message}`);
    }

    // ── Update Profile's active_report_id ──
    await supabase.from('profiles').update({ active_report_id: report.id }).eq('id', user.id);

    return NextResponse.json({ 
      message: 'Upload successful',
      report_id: report.id,
      stats: {
        pages: pageCount,
        words: wordCount,
        extractedChars: cleanedText.length,
      }
    });

  } catch (error: any) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
