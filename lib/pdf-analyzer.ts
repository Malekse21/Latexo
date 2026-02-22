// We use dynamic imports to avoid SSR issues with DOMMatrix not being defined
// in the server environment where pdfjs-dist might try to initialize.

export interface PdfAnalysisResult {
  pageCount: number;
  wordCount: number;
  thumbnail: Blob | null;
}

export async function analyzePdf(file: File): Promise<PdfAnalysisResult> {
  // 1. Dynamic import of PDF.js
  const pdfJS = await import('pdfjs-dist');
  
  // 2. Configure Worker
  if (typeof window !== 'undefined' && !pdfJS.GlobalWorkerOptions.workerSrc) {
     pdfJS.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // @ts-ignore - Handle potential type mismatch with pdfjs-dist
    const loadingTask = pdfJS.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const pageCount = pdf.numPages;
    
    // Extract text for word count
    let fullText = '';
    const maxPagesToScan = 50; 
    const scanLimit = Math.min(pageCount, maxPagesToScan);
    
    // Process pages sequentially
    for (let i = 1; i <= scanLimit; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // @ts-ignore
        const strings = content.items.map((item: any) => item.str);
        fullText += strings.join(' ') + ' ';
    }
    
    const wordCount = fullText.trim().split(/\s+/).length;
    
    // Generate Thumbnail (Page 1)
    let thumbnail: Blob | null = null;
    try {
        const page1 = await pdf.getPage(1);
        const viewport = page1.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (context) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page1.render({
                canvasContext: context,
                viewport: viewport
            } as any).promise;
            
            thumbnail = await new Promise<Blob | null>(resolve => 
                canvas.toBlob(resolve, 'image/png')
            );
        }
    } catch (e) {
        console.error("Thumbnail generation failed", e);
    }
    
    return {
        pageCount,
        wordCount,
        thumbnail
    };

  } catch (error) {
    console.error("PDF Analysis failed:", error);
    throw error;
  }
}
