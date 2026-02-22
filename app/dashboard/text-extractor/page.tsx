"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Copy, Download, Loader2 } from "lucide-react";

export default function TextExtractorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState("");

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setExtractedText("");
    setError("");
    setIsExtracting(true);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const response = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Extraction failed");
      }

      const data = await response.json();
      setExtractedText(data.text);
    } catch (err: any) {
      console.error("Extraction error:", err);
      setError(err.message || "Failed to extract text");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const fileType = droppedFile.name.toLowerCase();
      if (fileType.endsWith(".pdf") || fileType.endsWith(".docx")) {
        handleFileUpload(droppedFile);
      } else {
        setError("Please upload a PDF or DOCX file");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
    // Could add a toast notification here
  };

  const downloadText = () => {
    const blob = new Blob([extractedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name.replace(/\.(pdf|docx)$/i, "")}_extracted.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-black py-4 px-6">
        <h1 className="text-2xl font-bold font-mono uppercase tracking-wider">
          Text Extractor
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload PDF or DOCX files to extract text
        </p>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 grid grid-cols-2 divide-x divide-black">
        {/* Left Side - Upload */}
        <div className="p-6 flex flex-col">
          <h2 className="text-lg font-bold mb-4 uppercase tracking-wider">
            Upload Document
          </h2>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="flex-1 border-2 border-dashed border-black p-8 flex flex-col items-center justify-center transition-colors hover:bg-gray-50"
          >
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: file ? 1.1 : 1 }}
              className="text-center"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" />
                  <p className="text-lg font-semibold">Extracting text...</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Processing {file?.name}
                  </p>
                </>
              ) : file ? (
                <>
                  <FileText className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg font-semibold">{file.name}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <button
                    onClick={() => {
                      setFile(null);
                      setExtractedText("");
                      setError("");
                    }}
                    className="mt-4 px-4 py-2 border border-black hover:bg-black hover:text-white transition-colors text-sm"
                  >
                    Upload Different File
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-semibold mb-2">
                    Drop your file here
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    or click to browse
                  </p>
                  <label className="cursor-pointer px-6 py-3 bg-black text-white font-bold uppercase tracking-wider hover:bg-gray-900 transition-colors">
                    Choose File
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-4">
                    Supported formats: PDF, DOCX
                  </p>
                </>
              )}
            </motion.div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 border border-red-500 bg-red-50 text-red-700"
            >
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </motion.div>
          )}
        </div>

        {/* Right Side - Extracted Text */}
        <div className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold uppercase tracking-wider">
              Extracted Text
            </h2>
            {extractedText && (
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 border border-black hover:bg-black hover:text-white transition-colors text-xs flex items-center gap-2"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button
                  onClick={downloadText}
                  className="px-3 py-1.5 bg-black text-white hover:bg-gray-900 transition-colors text-xs flex items-center gap-2"
                  title="Download as TXT"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 border border-black p-4 bg-gray-50 overflow-auto">
            {extractedText ? (
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {extractedText}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    Extracted text will appear here
                  </p>
                </div>
              </div>
            )}
          </div>

          {extractedText && (
            <div className="mt-4 text-xs text-gray-600">
              <p>
                Character count: {extractedText.length.toLocaleString()} |
                Word count: {extractedText.split(/\s+/).filter(Boolean).length.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
