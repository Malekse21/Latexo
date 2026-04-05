// Client-side PDF/DOCX analysis: text extraction, word count, thumbnail generation.
// All heavy processing happens here in the browser — we never send
// the binary file to a Next.js API route for parsing.

export interface FileAnalysisResult {
  pageCount: number;
  wordCount: number;
  thumbnail: Blob | null;
  extractedText: string;
  fileType: "pdf" | "docx";
}

// ── Constraints ──────────────────────────────────────────────
export const MAX_FILE_SIZE_MB = 70;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_PAGE_COUNT = 150; // PFE reports rarely exceed 120

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileValidationError";
  }
}

// ── Helpers ──────────────────────────────────────────────────

/** Detect file type from name / MIME. Returns null if unsupported. */
export function detectFileType(file: File): "pdf" | "docx" | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (
    name.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "docx";
  return null;
}

/** Validate size and type before doing any heavy work. */
export function validateFile(file: File): "pdf" | "docx" {
  const type = detectFileType(file);
  if (!type) {
    throw new FileValidationError(
      "Unsupported file format. Please upload a PDF or DOCX file."
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new FileValidationError(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`
    );
  }
  return type;
}

// ── PDF Analysis ─────────────────────────────────────────────

async function analyzePdfFile(file: File): Promise<FileAnalysisResult> {
  const pdfJS = await import("pdfjs-dist");

  // Configure Worker (client-side only)
  if (typeof window !== "undefined" && !pdfJS.GlobalWorkerOptions.workerSrc) {
    pdfJS.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.arrayBuffer();

  // @ts-ignore
  const loadingTask = pdfJS.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  if (pageCount > MAX_PAGE_COUNT) {
    throw new FileValidationError(
      `Document has ${pageCount} pages. Maximum allowed is ${MAX_PAGE_COUNT} pages.`
    );
  }

  // ── Extract ALL text (full document) ──────────────────────
  let fullText = "";
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // @ts-ignore
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(" ") + "\n\n";
  }

  const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;

  // ── Generate Thumbnail (Page 1) ───────────────────────────
  let thumbnail: Blob | null = null;
  try {
    const page1 = await pdf.getPage(1);
    const viewport = page1.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (context) {
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await (page1.render({
        canvasContext: context,
        viewport: viewport,
      } as any)).promise;

      thumbnail = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
    }
  } catch (e) {
    console.error("Thumbnail generation failed", e);
  }

  return {
    pageCount,
    wordCount,
    thumbnail,
    extractedText: fullText,
    fileType: "pdf",
  };
}

// ── DOCX Analysis ────────────────────────────────────────────

async function analyzeDocxFile(file: File): Promise<FileAnalysisResult> {
  // mammoth works fine in the browser
  const mammoth = await import("mammoth");

  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const extractedText: string = result.value;

  const wordCount = extractedText.trim().split(/\s+/).filter(Boolean).length;

  // Rough page estimate for DOCX (≈250 words/page)
  const pageCount = Math.max(1, Math.round(wordCount / 250));

  // No thumbnail for DOCX
  return {
    pageCount,
    wordCount,
    thumbnail: null,
    extractedText,
    fileType: "docx",
  };
}

// ── Public API ───────────────────────────────────────────────

/**
 * Analyze a PDF or DOCX file client-side.
 * Returns page count, word count, extracted text, and an optional thumbnail.
 * Throws `FileValidationError` for size / type / page-count issues.
 */
export async function analyzeFile(file: File): Promise<FileAnalysisResult> {
  const fileType = validateFile(file);

  if (fileType === "pdf") {
    return analyzePdfFile(file);
  } else {
    return analyzeDocxFile(file);
  }
}

// Keep legacy export for backward compat (only used internally)
export const analyzePdf = analyzePdfFile;
