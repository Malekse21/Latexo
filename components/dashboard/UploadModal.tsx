"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  FileText,
  ScanSearch,
  CloudUpload,
  DatabaseZap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/context/user-context";
import { createClient } from "@/lib/supabase/client";
import {
  analyzeFile,
  FileValidationError,
  validateFile,
  MAX_FILE_SIZE_MB,
} from "@/lib/pdf-analyzer";
import { Portal } from "@/components/ui/portal";

// ── Types ───────────────────────────────────────────────────
interface UploadStep {
  key: "validating" | "extracting" | "uploading" | "finalizing";
  label: string;
  icon: React.ElementType;
}

const UPLOAD_STEPS_KEYS = [
  { key: "validating", labelKey: "upload.step_validating", icon: FileText },
  { key: "extracting", labelKey: "upload.step_extracting", icon: ScanSearch },
  { key: "uploading", labelKey: "upload.step_uploading", icon: CloudUpload },
  { key: "finalizing", labelKey: "upload.step_saving", icon: DatabaseZap },
];

interface UploadStatus {
  status: "idle" | "processing" | "complete" | "error";
  currentStep: number; // index into UPLOAD_STEPS
  message: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (reportId: string) => void;
}

// ── Component ───────────────────────────────────────────────
export function UploadModal({ isOpen, onClose, onComplete }: UploadModalProps) {
  const { t, profile } = useUser();
  const [isDragging, setIsDragging] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: "idle",
    currentStep: 0,
    message: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Drag & Drop ─────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelected(files[0]);
      }
    },
    [profile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelected(files[0]);
      }
      // Reset the input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [profile]
  );

  // ── File Selection ──────────────────────────────────────
  const handleFileSelected = (file: File) => {
    // Early validation (type + size) — instant feedback before any processing
    try {
      validateFile(file);
    } catch (err: any) {
      setUploadStatus({
        status: "error",
        currentStep: 0,
        message: err.message,
      });
      return;
    }

    if (profile?.active_report_id) {
      setPendingFile(file);
      setShowConfirmation(true);
    } else {
      processAndUpload(file);
    }
  };

  const confirmUpload = () => {
    if (pendingFile) {
      processAndUpload(pendingFile, true);
      setShowConfirmation(false);
      setPendingFile(null);
    }
  };

  // ── Core Pipeline ───────────────────────────────────────
  // Architecture:
  //   Step 1-2: Client-side validation + text extraction (fast, no server load)
  //   Step 3:   Upload PDF + thumbnail directly to Supabase Storage from browser
  //             (RLS policies ensure users can only write to their own folder)
  //   Step 4:   Send lightweight JSON metadata to API route for DB operations
  const processAndUpload = async (
    file: File,
    confirmDeletion: boolean = false
  ) => {
    try {
      // ▸ Step 1: Validating
      setUploadStatus({
        status: "processing",
        currentStep: 0,
        message: t("upload.msg_checking") || "Checking file...",
      });

      // Small delay so the UI renders the first step
      await new Promise((r) => setTimeout(r, 100));

      // ▸ Step 2: Extracting text + thumbnail client-side
      setUploadStatus({
        status: "processing",
        currentStep: 1,
        message: t("upload.msg_scanning") || "Scanning your document...",
      });

      const analysis = await analyzeFile(file);

      // ▸ Step 3: Upload file directly to Supabase Storage from browser
      //   RLS policies restrict users to their own folder (user_id/*)
      setUploadStatus({
        status: "processing",
        currentStep: 2,
        message: t("upload.step_uploading") || "Uploading PDF...",
      });

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired. Please log in again.");

      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${user.id}/${timestamp}_${safeName}`;

      // Upload PDF/DOCX binary directly to storage (bypasses Vercel body limit)
      const { error: storageError } = await supabase.storage
        .from("pfes")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || "application/octet-stream",
        });

      if (storageError) {
        console.error("Storage upload error:", storageError);
        throw new Error(`File upload failed: ${storageError.message}`);
      }

      // Upload thumbnail if available
      let thumbnailUrl: string | null = null;
      if (analysis.thumbnail) {
        const thumbPath = `${user.id}/${timestamp}_${safeName.replace(/\.(pdf|docx)$/i, "")}_thumb.png`;
        const { error: thumbError } = await supabase.storage
          .from("thumbnails")
          .upload(thumbPath, analysis.thumbnail, {
            upsert: true,
            contentType: "image/png",
          });

        if (!thumbError) {
          const { data: { publicUrl } } = supabase.storage
            .from("thumbnails")
            .getPublicUrl(thumbPath);
          thumbnailUrl = publicUrl;
        } else {
          console.error("Thumbnail upload error:", thumbError);
        }
      }

      // ▸ Step 4: Send lightweight metadata to API for DB operations
      setUploadStatus({
        status: "processing",
        currentStep: 3,
        message: t("upload.msg_finalizing") || "Finalizing...",
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath,
          thumbnailUrl,
          fileName: file.name,
          fileSize: file.size,
          pageCount: analysis.pageCount,
          wordCount: analysis.wordCount,
          extractedText: analysis.extractedText,
          fileType: analysis.fileType,
          confirmDeletion,
        }),
      });

      let data;
      const respContentType = response.headers.get("content-type");
      const text = await response.text();

      if (respContentType && respContentType.includes("application/json")) {
        try {
          data = JSON.parse(text);
        } catch {
          console.error("Failed to parse JSON upload response:", text);
          throw new Error(`Server error (${response.status}). Please try again.`);
        }
      } else {
        console.error("Non-JSON upload response:", text);
        throw new Error(`Server error (${response.status}). Please try again.`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Upload failed (${response.status})`);
      }

      // Brief pause to show the last step
      await new Promise((r) => setTimeout(r, 400));

      // ▸ Complete!
      setUploadStatus({
        status: "complete",
        currentStep: 3,
        message: `${analysis.pageCount} pages · ${analysis.wordCount.toLocaleString()} words`,
      });

      setTimeout(() => {
        onComplete(data.report_id || "");
        onClose();
        setUploadStatus({ status: "idle", currentStep: 0, message: "" });
      }, 1500);
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadStatus({
        status: "error",
        currentStep: 0,
        message:
          error instanceof FileValidationError
            ? error.message
            : error.message || "Something went wrong. Please try again.",
      });
    }
  };

  // ── Close ───────────────────────────────────────────────
  const handleClose = () => {
    if (uploadStatus.status !== "processing") {
      setUploadStatus({ status: "idle", currentStep: 0, message: "" });
      setShowConfirmation(false);
      setPendingFile(null);
      onClose();
    }
  };

  // ── Render ──────────────────────────────────────────────
  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/50 z-[9999] backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg pointer-events-auto">
                {/* ── Header ─────────────────────────────── */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-black">
                    {t("upload.title") || "Upload Report"}
                  </h2>
                  <button
                    onClick={handleClose}
                    disabled={uploadStatus.status === "processing"}
                    className="text-gray-400 hover:text-black transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* ── Body ───────────────────────────────── */}
                <div className="p-6">
                  {/* Idle — Drop zone */}
                  {uploadStatus.status === "idle" && !showConfirmation && (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all",
                        isDragging
                          ? "border-black bg-gray-50"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-sm font-medium text-black mb-1">
                        {t("upload.drop_here") ||
                          "Drop your file here, or click to browse"}
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF or DOCX · Max {MAX_FILE_SIZE_MB} MB
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  )}

                  {/* Confirmation — update existing report */}
                  {showConfirmation && (
                    <div className="space-y-6 text-center">
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-amber-900 mb-2">
                          {t("upload.update_title") || "Update Existing Report"}
                        </h3>
                        <p className="text-sm text-amber-700">
                          {t("upload.update_desc_1")} <br />
                          <strong>
                            {t("upload.update_desc_2")}
                          </strong>
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setShowConfirmation(false);
                            setPendingFile(null);
                          }}
                          className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          {t("upload.cancel")}
                        </button>
                        <button
                          onClick={confirmUpload}
                          className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-bold"
                        >
                          {t("upload.confirm_update")}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Processing — step-by-step progress */}
                  {uploadStatus.status === "processing" && (
                    <div className="space-y-5 py-2">
                      {UPLOAD_STEPS_KEYS.map((step, index) => {
                        const isActive = index === uploadStatus.currentStep;
                        const isCompleted = index < uploadStatus.currentStep;
                        const isPending = index > uploadStatus.currentStep;
                        const Icon = step.icon;

                        return (
                          <motion.div
                            key={step.key}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                              "flex items-center gap-4 px-4 py-3 rounded-lg transition-all",
                              isActive && "bg-gray-50 border border-gray-200",
                              isCompleted && "opacity-60",
                              isPending && "opacity-30"
                            )}
                          >
                            <div
                              className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all",
                                isActive && "bg-black",
                                isCompleted && "bg-gray-300",
                                isPending && "bg-gray-100"
                              )}
                            >
                              {isActive ? (
                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                              ) : isCompleted ? (
                                <CheckCircle className="w-4 h-4 text-white" />
                              ) : (
                                <Icon className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-sm font-medium truncate",
                                  isActive
                                    ? "text-black"
                                    : isCompleted
                                      ? "text-gray-500"
                                      : "text-gray-400"
                                )}
                              >
                                {t(step.labelKey)}
                              </p>
                              {isActive && uploadStatus.message && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                  {uploadStatus.message}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Complete */}
                  {uploadStatus.status === "complete" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center gap-3 py-6"
                    >
                      <CheckCircle className="w-16 h-16 text-gray-900" />
                      <p className="text-xl font-bold text-black">
                        {t("upload.done") || "Upload Complete"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {uploadStatus.message}
                      </p>
                    </motion.div>
                  )}

                  {/* Error */}
                  {uploadStatus.status === "error" && (
                    <div className="space-y-6 text-center py-4">
                      <div className="flex flex-col items-center gap-3">
                        <AlertCircle className="w-16 h-16 text-red-500" />
                        <p className="text-sm font-medium text-black">
                          {uploadStatus.message}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setUploadStatus({
                            status: "idle",
                            currentStep: 0,
                            message: "",
                          })
                        }
                        className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        {t("upload.try_again") || "Try Again"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}
