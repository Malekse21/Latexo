# 📄 PDF Upload & Deep Analysis Pipeline - Implementation Guide

## 🎯 Overview

This system provides a seamless PDF upload experience with real-time AI analysis, similar to Datafast's polished interface.

---

## 📁 File Structure

```
app/
├── api/
│   └── upload/
│       └── route.ts          # Backend API with streaming updates
├── dashboard/
│   └── page.tsx             # Main reports page
components/
├── dashboard/
│   ├── UploadModal.tsx      # Drag & drop upload UI
│   ├── ReportCard.tsx       # Enhanced report card
│   └── skeletons.tsx        # Loading states
lib/
├── store/
│   └── useAppStore.ts       # Zustand global state
└── hooks/
    └── useFeatureGuard.ts   # Feature access control
supabase/
└── enhanced_reports_migration.sql  # Database schema updates
```

---

## 🗄️ Database Schema

### Enhanced `reports` Table

```sql
id: uuid (primary key)
user_id: uuid (references auth.users)
title: text
name: text                    -- File name
thumbnail_url: text           -- B&W first-page thumbnail
page_count: int              -- Total pages
word_count: int              -- Total words
data: jsonb                  -- AI analysis JSON
status: text                 -- 'pending', 'analyzing', 'completed', 'failed'
created_at: timestamp
```

### AI Analysis JSON Structure

```typescript
{
  problem_statement: string,
  tech_stack: string[],
  strengths: string[],
  weaknesses: string[],
  logic_alignment_score: number  // 0-100
}
```

---

## 🔧 Backend Pipeline (`/api/upload`)

### Flow

1. **File Upload** → Receive PDF via FormData
2. **PDF Parsing** → Extract page count, word count, text using `pdf-parse`
3. **Thumbnail Generation** → Create B&W 300px image with `sharp`
4. **Storage Upload** → Upload thumbnail to Supabase Storage
5. **AI Analysis** → Call OpenRouter API with DeepSeek R1
6. **Database Save** → Insert report with all data

### Streaming Status Updates

```typescript
data: {"status":"uploading","message":"Processing PDF..."}
data: {"status":"extracting","message":"Extracted 120 pages, 35000 words"}
data: {"status":"ai_analyzing","message":"AI analyzing structure..."}
data: {"status":"complete","message":"Upload complete!","report_id":"uuid"}
```

---

## 🎨 Frontend Components

### 1. Upload Modal

Features:
- Drag & drop zone
- Real-time progress indicators
- Framer Motion animations
- B&W pulsing loader during AI analysis
- Auto-close on success

States:
1. **Idle** → Empty dropzone
2. **Uploading** → Rotating file icon + progress bar
3. **Analyzing** → Pulsing circle with status text
4. **Complete** → Checkmark with auto-redirect

### 2. Report Card

Features:
- B&W thumbnail display
- Page & word count stats
- 3-dot menu (Rename, Download, Delete)
- Active indicator (green dot)
- Hover animations
- Click to select/activate

### 3. Reports Page

Features:
- 5-slot grid (filled + empty slots)
- "Upload PDF" button in header
- Integrated skeleton loaders
- Zustand state management
- CRUD operations (Create, Read, Update, Delete)

---

## 🔑 Environment Variables

Add to `.env.local`:

```env
# OpenRouter API
OPENROUTER_API_KEY=your_key_here

# Site URL (for API referrer)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 🚀 Usage Examples

### Upload a PDF

```tsx
import { UploadModal } from '@/components/dashboard/UploadModal';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowModal(true)}>
        Upload PDF
      </button>
      
      <UploadModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onComplete={(reportId) => {
          console.log('Uploaded:', reportId);
          // Refresh list, select report, etc.
        }}
      />
    </>
  );
}
```

### Select Active Report

```tsx
import { useAppStore } from '@/lib/store/useAppStore';

function AnalysisPage() {
  const { selectedReport } = useAppStore();
  
  if (!selectedReport) {
    return <p>Please select a report first.</p>;
  }
  
  return <div>Analyzing: {selectedReport.name}</div>;
}
```

### Use Feature Guard

```tsx
import { useFeatureGuard } from '@/lib/hooks/useFeatureGuard';

function PlagiarismPage() {
  const { hasAccess, isLoading } = useFeatureGuard({ 
    requireReport: true,
    cost: 5  // Credits required
  });
  
  if (isLoading) return <Skeleton />;
  if (!hasAccess) return null; // Auto-redirects
  
  return <PlagiarismScanner />;
}
```

---

## 🧪 Testing Checklist

- [ ] **Upload Flow**
  - [ ] Drag & drop works
  - [ ] Click to select file works
  - [ ] Status updates stream correctly
  - [ ] AI analysis completes
- [ ] **Report Display**
  - [ ] Thumbnails show correctly
  - [ ] Stats (pages, words) display
  - [ ] Active indicator shows
- [ ] **CRUD Operations**
  - [ ] Select report sets active
  - [ ] Rename updates title
  - [ ] Delete removes from grid
- [ ] **Edge Cases**
  - [ ] Max 5 reports enforced
  - [ ] Upload button disabled when full
  - [ ] Error handling shows

---

## 🎨 Design Philosophy

All UI follows your **B&W aesthetic**:
- ✅ Grayscale thumbnails
- ✅ Black progress bars
- ✅ Minimal, clean animations
- ✅ Pulsing loaders (no color)

---

## 🐛 Known Limitations

1. **Thumbnail Generation**: Currently uses placeholder SVG. For real PDF → image conversion, consider:
   - `pdf-lib` + `canvas` (Node.js)
   - External service (e.g., Cloudinary)

2. **OpenRouter Costs**: Monitor API usage. DeepSeek R1 is cost-effective but has rate limits.

3. **File Size**: Current limit: 10MB. Adjust in UI and add backend validation.

---

## 🔄 Next Steps

1. **Run Database Migration**:
   ```sql
   -- In Supabase SQL Editor
   -- Run: supabase/enhanced_reports_migration.sql
   ```

2. **Add OpenRouter API Key**:
   ```bash
   # In .env.local
   OPENROUTER_API_KEY=sk-or-...
   ```

3. **Test Upload Flow**:
   - Visit `/dashboard`
   - Click "Upload PDF"
   - Drag & drop a PDF
   - Watch the magic happen! ✨

---

**Status**: ✅ Complete and Ready for Testing  
**Date**: 2026-01-29
