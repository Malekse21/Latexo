"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, CheckCircle, AlertCircle, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/context/user-context";
import { analyzePdf } from "@/lib/pdf-analyzer";
import { Portal } from "@/components/ui/portal";
import { posthog } from "@/components/providers/posthog-provider";

interface UploadStatus {
  status: 'idle' | 'uploading' | 'complete' | 'error';
  message: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (reportId: string) => void;
}

export function UploadModal({ isOpen, onClose, onComplete }: UploadModalProps) {
  const { t, profile } = useUser();
  const [isDragging, setIsDragging] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    message: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      handleFileSelected(files[0]);
    }
  }, [profile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  }, [profile]);

  const handleFileSelected = (file: File) => {
    if (profile?.active_report_id) {
      setPendingFile(file);
      setShowConfirmation(true);
    } else {
      uploadFile(file);
    }
  };

  const confirmUpload = () => {
    if (pendingFile) {
      uploadFile(pendingFile, true);
      setShowConfirmation(false);
      setPendingFile(null);
    }
  };

  const uploadFile = async (file: File, confirmDeletion: boolean = false) => {
    setUploadStatus({ status: 'uploading', message: t('upload.analyzing') });

    try {
      // Use new client-side analysis function
      const { pageCount, wordCount, thumbnail } = await analyzePdf(file);
      
      setUploadStatus({ status: 'uploading', message: t('upload.uploading_pdf') });
      
      const formData = new FormData();
      formData.append('file', file);
      if (thumbnail) {
        formData.append('thumbnail', thumbnail, 'thumbnail.png');
      }
      // Send calculated stats to server
      formData.append('pageCount', pageCount.toString());
      formData.append('wordCount', wordCount.toString());
      if (confirmDeletion) {
        formData.append('confirmDeletion', 'true');
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadStatus({ 
        status: 'complete', 
        message: t('upload.upload_success', { pageCount, wordCount })
      });

      // PostHog: Track report upload
      posthog.capture('report_uploaded', {
        page_count: pageCount,
        word_count: wordCount,
      });

      setTimeout(() => {
        onComplete(data.report_id || '');
        onClose();
        setUploadStatus({ status: 'idle', message: '' });
      }, 1500);

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus({ 
        status: 'error', 
        message: error.message || t('upload.failed')
      });
    }
  };

  const handleClose = () => {
    if (uploadStatus.status !== 'uploading') {
      setUploadStatus({ status: 'idle', message: '' });
      onClose();
    }
  };

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
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-black">{t('upload.title')}</h2>
                  <button
                    onClick={handleClose}
                    disabled={uploadStatus.status === 'uploading'}
                    className="text-gray-400 hover:text-black transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6">
                  {uploadStatus.status === 'idle' && !showConfirmation && (
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
                        {t('upload.drop_here')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('upload.only_pdf')}
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  )}

                  {showConfirmation && (
                    <div className="space-y-6 text-center">
                      <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-red-900 mb-2">Existing Data Warning</h3>
                        <p className="text-sm text-red-700">
                          Uploading a new report will permanently delete your existing report, 
                          all simulation results, and extracted data. This action cannot be undone.
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
                          Cancel
                        </button>
                        <button
                          onClick={confirmUpload}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold"
                        >
                          Yes, Delete and Upload
                        </button>
                      </div>
                    </div>
                  )}

                  {uploadStatus.status !== 'idle' && !showConfirmation && (
                    <div className="space-y-6 text-center">
                      <div className="flex justify-center">
                        {uploadStatus.status === 'uploading' && (
                          <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-12 h-12 text-black animate-spin" />
                            <div className="space-y-1">
                               <p className="text-lg font-bold text-black">{uploadStatus.message}</p>
                               <p className="text-sm text-gray-500">{t('upload.analyzing_subtitle')}</p>
                            </div>
                          </div>
                        )}
                        {uploadStatus.status === 'complete' && (
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle className="w-16 h-16 text-green-500" />
                            <p className="text-xl font-bold text-black">{t('upload.done')}</p>
                          </div>
                        )}
                        {uploadStatus.status === 'error' && (
                          <AlertCircle className="w-16 h-16 text-red-500" />
                        )}
                      </div>
                      
                      {uploadStatus.status !== 'uploading' && (
                        <p className="text-sm font-medium text-black">
                          {uploadStatus.message}
                        </p>
                      )}

                      {uploadStatus.status === 'error' && (
                        <button
                          onClick={() => setUploadStatus({ status: 'idle', message: '' })}
                          className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          {t('upload.try_again')}
                        </button>
                      )}
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
