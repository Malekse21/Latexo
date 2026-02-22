import { FileText, Type, Hash, Globe } from "lucide-react";
import { format } from "date-fns";
import { useUser } from "@/lib/context/user-context";

interface StatsPanelProps {
  filename?: string;
  pageCount?: number | null;
  wordCount?: number | null;
  createdAt?: string;
  language?: string | null;
}

export function StatsPanel({ filename, pageCount, wordCount, createdAt, language }: StatsPanelProps) {
  const { t } = useUser();
  return (
    <div className="flex flex-col gap-6 p-6 w-full h-full justify-center">
      <h3 className="text-xl font-bold mb-2 font-mono uppercase tracking-wider">{t('stats.title')}</h3>
      
      <div className="space-y-6">
        {/* Filename */}
        <div className="flex items-start gap-4 group">
          <div className="p-2 border border-gray-200 rounded-md bg-gray-50 group-hover:bg-gray-100 transition-colors">
            <FileText className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">{t('stats.filename')}</p>
            <p className="font-medium text-gray-900 truncate max-w-[200px] sm:max-w-[300px]" title={filename}>
              {filename || t('stats.no_file')}
            </p>
          </div>
        </div>

        {/* Page Count */}
        <div className="flex items-center gap-4 group">
          <div className="p-2 border border-gray-200 rounded-md bg-gray-50 group-hover:bg-gray-100 transition-colors">
            <Hash className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">{t('stats.page_count')}</p>
            <p className="font-medium text-gray-900">
              {pageCount !== undefined && pageCount !== null ? `${pageCount} ${t('stats.pages')}` : "--"}
            </p>
          </div>
        </div>

        {/* Word Count */}
        <div className="flex items-center gap-4 group">
          <div className="p-2 border border-gray-200 rounded-md bg-gray-50 group-hover:bg-gray-100 transition-colors">
            <Type className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">{t('stats.word_count')}</p>
            <p className="font-medium text-gray-900">
              {wordCount !== undefined && wordCount !== null ? `${wordCount.toLocaleString()} ${t('stats.words')}` : "--"}
            </p>
          </div>
        </div>
        {/* Language */}
        <div className="flex items-center gap-4 group">
          <div className="p-2 border border-gray-200 rounded-md bg-gray-50 group-hover:bg-gray-100 transition-colors">
            <Globe className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">{t('stats.language')}</p>
            <p className="font-medium text-gray-900 capitalize">
              {language || "English"}
            </p>
          </div>
        </div>
        
        {/* Date */}
        {createdAt && (
             <div className="flex items-center gap-4 group mt-4 pt-4 border-t border-dashed border-gray-200">
             <div>
               <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Uploaded On</p>
               <p className="text-sm font-medium text-gray-600">
                 {format(new Date(createdAt), "MMMM d, yyyy")}
               </p>
             </div>
           </div>
        )}
      </div>
    </div>
  );
}
