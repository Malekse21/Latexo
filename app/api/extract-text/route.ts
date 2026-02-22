import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    let extractedText = "";

    // PDF Extraction
    if (fileName.endsWith(".pdf")) {
      try {
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
      } catch (error: any) {
        console.error("PDF extraction error:", error);
        return NextResponse.json(
          { error: `Failed to extract PDF: ${error.message}` },
          { status: 500 }
        );
      }
    }
    // DOCX Extraction
    else if (fileName.endsWith(".docx")) {
      try {
        const mammoth = require("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } catch (error: any) {
        console.error("DOCX extraction error:", error);
        return NextResponse.json(
          { error: `Failed to extract DOCX: ${error.message}` },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported file format. Please upload PDF or DOCX." },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      text: extractedText.trim(),
      fileType: fileName.endsWith(".pdf") ? "pdf" : "docx",
      fileName: file.name,
      detectedLanguage: detectedLang,
    });
  } catch (error: any) {
    console.error("Text extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract text" },
      { status: 500 }
    );
  }
}
