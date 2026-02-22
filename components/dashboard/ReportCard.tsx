"use client";

import Image from "next/image";
import { FileText, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  id: string;
  name: string;
  thumbnail_url?: string | null;
  page_count?: number | null;
  word_count?: number | null;
  created_at: string;
  isActive?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
}

export function ReportCard({
  id,
  name,
  thumbnail_url,
  page_count,
  word_count,
  created_at,
  isActive = false,
  onSelect,
  onDelete,
  onRename
}: ReportCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(name);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRename = () => {
    if (newName.trim() && newName !== name) {
      onRename?.(id, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleDeleteConfirm = () => {
    setIsDeleting(true);
    onDelete?.(id);
    setShowDeleteModal(false);
    setIsDeleting(false); // Assuming onDelete handles async and updates state elsewhere
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        onClick={() => onSelect?.(id)}
        className={cn(
          "relative group bg-white border rounded-lg overflow-hidden cursor-pointer transition-all",
          isActive 
            ? "border-black shadow-lg ring-2 ring-black ring-offset-2" 
            : "border-gray-200 hover:border-gray-300 hover:shadow-md"
        )}
      >
        {/* Active Indicator */}
        {isActive && (
          <div className="absolute top-3 left-3 z-10">
            <div className="w-3 h-3 bg-black rounded-full animate-pulse" />
          </div>
        )}

        {/* Thumbnail */}
        <div className="relative w-full h-48 bg-gray-50 border-b border-gray-100">
          {thumbnail_url ? (
            <Image
              src={thumbnail_url}
              alt={name}
              fill
              className="object-contain p-2"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <FileText className="w-16 h-16 text-gray-300" strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Name */}
          {isRenaming ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setIsRenaming(false);
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="w-full text-sm font-bold text-black border border-black rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black"
            />
          ) : (
            <h3 className="text-sm font-bold text-black truncate mb-2">
              {name}
            </h3>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            {page_count && (
              <span>{page_count} pages</span>
            )}
            {word_count && (
              <span>{word_count.toLocaleString()} words</span>
            )}
          </div>

          {/* Date */}
          <p className="text-xs text-gray-400">
            {new Date(created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>

        {/* Menu Button */}
        <div className="absolute top-3 right-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-all opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg p-1 z-20"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setIsRenaming(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-black hover:bg-gray-50 rounded transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Rename
                </button>

                <button
                  onClick={() => {
                    setShowDeleteModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await onDelete?.(id);
            setShowDeleteModal(false);
          } catch (error) {
            console.error('Delete failed:', error);
          } finally {
            setIsDeleting(false);
          }
        }}
        reportName={name}
        isDeleting={isDeleting}
      />
    </>
  );
}
