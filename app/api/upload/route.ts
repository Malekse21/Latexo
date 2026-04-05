import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Allow large payloads (file binary + extracted text) and longer execution
export const config = {
  api: {
    bodyParser: false, // FormData handles its own parsing
  },
};
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

// ── API Route ────────────────────────────────────────────────
// Hybrid approach:
//   - The client extracts text + thumbnail in-browser (no server-side pdfjs/mammoth)
//   - The client sends the file binary + extracted text via FormData
//   - This API handles: storage upload, text cleaning, language detection, DB write

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const thumbnail = formData.get('thumbnail') as File | null;
    const confirmDeletion = formData.get('confirmDeletion') === 'true';

    // Pre-extracted text from the client (no more server-side PDF parsing!)
    const extractedText = (formData.get('extractedText') as string) || '';
    const pageCount = parseInt(formData.get('pageCount') as string || '0', 10);
    const wordCount = parseInt(formData.get('wordCount') as string || '0', 10);

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
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

    // ── Upload PDF/DOCX to Storage ──
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${user.id}/${timestamp}_${safeName}`;

    const { error: pdfUploadError } = await supabase.storage
      .from('pfes')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type || 'application/octet-stream',
      });

    if (pdfUploadError) {
      throw new Error(`PDF Storage Upload failed: ${pdfUploadError.message}`);
    }

    // ── Upload Thumbnail ──
    let thumbnailUrl: string | null = null;
    if (thumbnail) {
      const thumbnailPath = `${user.id}/${timestamp}_${safeName.replace(/\.(pdf|docx)$/i, '')}_thumb.png`;
      const { error: thumbUploadError } = await supabase.storage
        .from('thumbnails')
        .upload(thumbnailPath, thumbnail, {
          upsert: true,
          contentType: 'image/png',
        });

      if (!thumbUploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('thumbnails')
          .getPublicUrl(thumbnailPath);
        thumbnailUrl = publicUrl;
      } else {
        console.error('Thumbnail upload error:', thumbUploadError);
      }
    }

    // ── Clean text + Detect language (using client-provided text) ──
    const cleanedText = cleanBoilerplate(extractedText).trim();
    const detectedLang = detectLanguage(extractedText);

    console.log(`Received ${extractedText.length} chars for ${file.name}. Language: ${detectedLang}`);

    // ── Save to Database ──
    const cleanTitle = file.name
      .replace(/\.(pdf|docx)$/i, '')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ');

    const reportDataPayload = {
      user_id: user.id,
      title: cleanTitle,
      name: cleanTitle,
      file_path: filePath,
      thumbnail_url: thumbnailUrl,
      page_count: pageCount,
      word_count: wordCount,
      size_bytes: file.size,
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
