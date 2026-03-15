import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteUserReports } from '@/lib/supabase/cleanup';

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

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Handle One-Report Policy: Clear previous data if confirmed
    if (confirmDeletion) {
      console.log(`Cleaning up existing data for user ${user.id} before new upload...`);
      const { error: cleanupError } = await deleteUserReports(user.id);
      if (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
        // We continue anyway, but log the error
      }
    }

    // 1. Get stats from client
    const pageCount = parseInt(formData.get('pageCount') as string || '0', 10);
    const wordCount = parseInt(formData.get('wordCount') as string || '0', 10);

    // 2. Upload PDF to Storage (Private bucket 'pfes')
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${user.id}/${timestamp}_${safeName}`;

    const { data: pdfUploadData, error: pdfUploadError } = await supabase.storage
      .from('pfes')
      .upload(filePath, file, {
        upsert: true,
        contentType: 'application/pdf'
      });

    if (pdfUploadError) {
      throw new Error(`PDF Storage Upload failed: ${pdfUploadError.message}`);
    }

    // 3. Upload Thumbnail to Storage (Public bucket 'thumbnails') if present
    let thumbnailUrl = null;
    if (thumbnail) {
      const thumbnailPath = `${user.id}/${timestamp}_${safeName.replace('.pdf', '')}_thumb.png`;
      const { error: thumbUploadError } = await supabase.storage
        .from('thumbnails')
        .upload(thumbnailPath, thumbnail, {
          upsert: true,
          contentType: 'image/png'
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

    // 4. Extract Text from PDF or DOCX
    const fileName = file.name.toLowerCase();
    let extractedText = "";

    try {
      if (fileName.endsWith(".pdf")) {
        // PDF Extraction
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Polyfill for DOMMatrix
        if (!global.DOMMatrix) {
          // @ts-ignore
          global.DOMMatrix = class DOMMatrix {
            constructor() {}
            toString() {
              return "matrix(1, 0, 0, 1, 0, 0)";
            }
            multiply() {
              return this;
            }
            translate() {
              return this;
            }
            scale() {
              return this;
            }
          };
        }

        // @ts-ignore
        const pdfjsModule = await import("pdfjs-dist/build/pdf.mjs");
        const pdfjsLib = pdfjsModule.default || pdfjsModule;

        const path = require("path");
        const { pathToFileURL } = require("url");
        
        const workerPath = path.join(
          process.cwd(),
          "node_modules/pdfjs-dist/build/pdf.worker.mjs"
        );
        
        // Convert to file:// URL for Windows compatibility
        pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

        const uint8Array = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({
          data: uint8Array,
          useSystemFonts: true,
          disableFontFace: true,
        });

        const pdfDocument = await loadingTask.promise;
        const numPages = pdfDocument.numPages;

        for (let i = 1; i <= numPages; i++) {
          const page = await pdfDocument.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");
          extractedText += pageText + "\n\n";
        }
      } else if (fileName.endsWith(".docx")) {
        // DOCX Extraction
        const mammoth = require("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      }

      /**
       * Simple non-AI language detection based on common word frequency
       */
      const detectLanguage = (text: string): "french" | "english" => {
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
      };

      const detectedLang = detectLanguage(extractedText);

      console.log(`Extracted ${extractedText.length} characters from ${file.name}. Detected language: ${detectedLang}`);
      
      // Pass the language to the database insertion
      (request as any).detectedLang = detectedLang;
    } catch (extractError: any) {
      console.error("Text extraction error:", extractError);
      // Don't fail the upload if extraction fails, just log it
      extractedText = "";
    }

    // 5. Save to Database with extracted text
    const cleanTitle = file.name
      .replace(/\.(pdf|docx)$/i, '')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ');

    const { data: report, error: dbError } = await supabase
      .from('reports')
      .insert({
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
        detected_language: (request as any).detectedLang || 'english',
        extracted_text: cleanBoilerplate(extractedText).trim()
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database Insert failed: ${dbError.message}`);
    }

    // 6. Update Profile's active_report_id
    await supabase.from('profiles').update({ active_report_id: report.id }).eq('id', user.id);

    return NextResponse.json({ 
      message: 'Upload successful',
      report_id: report.id,
      stats: {
        pages: pageCount,
        words: wordCount,
        extractedChars: extractedText.length
       }
    });

  } catch (error: any) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
