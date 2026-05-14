import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkUploadRateLimit } from '@/lib/rate-limit-upload';

export const maxDuration = 60; // seconds (Vercel Pro limit)

/**
 * Strips boilerplate pages (cover, acknowledgments, TOC, list of figures)
 * from extracted PFE text. Keeps only the real content between
 * "Introduction générale" / "Chapitre 1" and "Conclusion générale" / "Bibliographie".
 */
function cleanBoilerplate(raw: string): string {
  let text = raw;

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

  if (startIndex > 0) {
    text = text.substring(startIndex);
  }
  if (endIndex > startIndex) {
    const adjustedEnd = (endIndex - (startIndex > 0 ? startIndex : 0)) + 3000;
    text = text.substring(0, Math.min(adjustedEnd, text.length));
  }

  return text.trim();
}

/**
 * Simple non-AI language detection based on common word frequency.
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

// ── Request body type ────────────────────────────────────────
interface UploadRequestBody {
  filePath: string;
  thumbnailUrl: string | null;
  fileName: string;
  fileSize: number;
  pageCount: number;
  wordCount: number;
  extractedText: string;
  fileType: 'pdf' | 'docx';
  confirmDeletion: boolean;
}

// ── API Route ────────────────────────────────────────────────
// Lightweight metadata-only route:
//   - The client uploads PDF/DOCX + thumbnail directly to Supabase Storage
//     (secured by RLS policies restricting writes to user's own folder)
//   - The client extracts text in-browser (no server-side pdfjs/mammoth)
//   - This API handles: validation, text cleaning, language detection,
//     old file cleanup (on update), and DB write

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate Limit Check
    const rateLimit = checkUploadRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many uploads. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
      );
    }

    // Parse JSON body (lightweight — no file binary)
    const body: UploadRequestBody = await request.json();
    const {
      filePath,
      thumbnailUrl,
      fileName,
      fileSize,
      pageCount,
      wordCount,
      extractedText,
      confirmDeletion,
    } = body;

    if (!filePath || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the uploaded file belongs to this user (security check)
    if (!filePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
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
            const { error: pdfError } = await supabase.storage.from('pfes').remove([existingReport.file_path]);
            if (pdfError) console.error("Error deleting old PDF:", pdfError);
          }
          if (existingReport.thumbnail_url) {
            try {
              const urlParts = existingReport.thumbnail_url.split('/');
              const fileName = urlParts[urlParts.length - 1];
              const thumbPath = `${user.id}/${fileName}`;
              const { error: thumbError } = await supabase.storage.from('thumbnails').remove([thumbPath]);
              if (thumbError) console.error("Error deleting old thumbnail:", thumbError);
            } catch (e) {}
          }
        }
      }
    }

    // ── Clean text + Detect language (using client-provided text) ──
    const cleanedText = cleanBoilerplate(extractedText || '').trim();
    const detectedLang = detectLanguage(extractedText || '');

    console.log(`Received ${(extractedText || '').length} chars for ${fileName}. Language: ${detectedLang}`);

    // ── Save to Database ──
    const cleanTitle = fileName
      .replace(/\.(pdf|docx)$/i, '')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ');

    const reportDataPayload = {
      user_id: user.id,
      title: cleanTitle,
      name: cleanTitle,
      file_path: filePath,
      thumbnail_url: thumbnailUrl,
      page_count: pageCount || 0,
      word_count: wordCount || 0,
      size_bytes: fileSize || 0,
      status: 'completed',
      data: {},
      detected_language: detectedLang,
      extracted_text: cleanedText,
    };

    let report;
    let dbError;

    if (existingReportId) {
      const res = await supabase
        .from('reports')
        .update(reportDataPayload)
        .eq('id', existingReportId)
        .select()
        .single();
      report = res.data;
      dbError = res.error;
    } else {
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

    // ── Update Profile ──
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
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
