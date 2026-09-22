# LATEXO — AI PFE Defense Simulator & Academic Assessment Platform

> **Latexo** is an enterprise-grade AI-powered SaaS platform built with Next.js 16, React 19, TypeScript, and Groq LLMs. It enables graduating university students (PFE, Master's, Engineering) to practice and master their thesis defense through real-time multi-agent AI jury simulations, automated manuscript analysis, voice-driven examination, and multi-dimensional diagnostic analytics.

---

## Technical Overview & Key Highlights

### Multi-Agent Jury Orchestration Engine
Simulates a live multi-person thesis defense examination using distinct AI jury personas configured with specialized system prompts and evaluation criteria:
- **Souad (Academic Rigor & Methodology)**: Evaluates research design, state-of-the-art literature review, academic citations, and theoretical validity.
- **Malek (System Architect & Technical Lead)**: Probes software architecture, database design choices, code quality, edge cases, scalability, and technical trade-offs.
- **Amir (Product & Business Stakeholder)**: Questions business viability, ROI, market positioning, target audience, and operational constraints.

### High-Throughput Document Parsing & Processing Pipeline
- Automated ingestion of PFE thesis manuscripts in PDF and DOCX formats (`pdfjs-dist`, `pdf-parse`, `mammoth`).
- Contextual extraction engine that extracts technical stack details, problem statements, methodology, and architectural diagrams to generate hyper-personalized jury questions.

### Low-Latency Voice Defense Arena
- Sub-second voice response transcription powered by **Groq Whisper Large v3**.
- Realistic jury examination room ambiance featuring procedural audio feedback (keyboard typing, background murmur, page turns).
- Text-to-speech integration for natural, conversational jury question dispatch.

### Diagnostic Performance Analytics & Scorecards
- Multi-axis evaluation algorithms measuring Technical Depth, Academic Rigor, Business Viability, Communication Clarity, and Stress Management.
- Post-session diagnostic reports providing actionable feedback, missing technical details, and benchmark answer suggestions.

### Dynamic Social Card Rendering & National Leaderboard
- National student leaderboard with university filter capabilities (e.g., EPI Sousse, ISSI Gabes, FSEG Mahdia).
- Server-side dynamic image generation powered by `@vercel/og` and Satori for shareable "Survivor Scorecards".

---

## Technical Stack & Architecture

| Layer | Technologies & Dependencies |
| :--- | :--- |
| **Framework & Core** | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5 |
| **Styling & UI** | Tailwind CSS v4, Framer Motion 12, Lucide Icons, Radix UI Primitives |
| **AI Inference & LLM** | Groq SDK (`llama-3.3-70b-versatile` for question generation and evaluation, `whisper-large-v3-turbo` for speech recognition) |
| **State Management** | Zustand 5 |
| **Backend & Database** | Supabase (SSR, PostgreSQL, Row Level Security, Storage Buckets) |
| **Document Processing** | `pdfjs-dist`, `pdf-parse`, `mammoth` |
| **Media & Delivery** | Nodemailer (Gmail SMTP), `@vercel/og`, Satori, Sharp |

---

## Codebase Structure

```
Latexo V4/
├── app/                        # Next.js App Router handlers and pages
│   ├── api/                    # Serverless API routes
│   │   ├── simulation/         # Chat, initialization, evaluation, and audio transcription
│   │   ├── extract-text/       # PDF/DOCX parsing pipeline
│   │   └── cron/               # Scheduled email follow-up tasks
│   ├── dashboard/              # Student portal, defense arena, and leaderboard
│   ├── login/                  # Auth login view
│   ├── signup/                 # Auth registration view
│   ├── onboarding/             # Profile configuration and university selection
│   └── maintenance/            # Maintenance state fallback view
├── components/                 # React UI components
│   ├── dashboard/              # DefenseArena, LeaderboardView, ReportCard, UploadModal
│   ├── landing/                # HeroV2, FeaturesGridSection, PricingSection, Navbar
│   ├── payment/                # Credits wall, payment gateway integration
│   └── ui/                     # Reusable design primitives (Buttons, Portals, Skeletons)
├── lib/                        # Infrastructure, utilities, and integrations
│   ├── supabase/               # Supabase SSR client, server, admin, and middleware
│   ├── i18n/                   # Translation payloads (English, French)
│   ├── store/                  # Global client state (Zustand)
│   ├── pdf-analyzer.ts         # Manuscript parsing engine
│   └── mail.ts                 # Email delivery service
├── src/                        # Core AI simulation domain logic
│   ├── config/                 # Agent profiles and Groq client configuration
│   └── services/session/       # Turn execution, evaluation logic, and state handlers
├── supabase/                   # Database schemas, migrations, and RLS policies
├── public/                     # Static media, jury avatars, audio files, and brand assets
├── .env.example                # Standardized environment configuration template
└── README.md                   # Repository documentation
```

---

## Engineering Design Decisions & Fault Tolerance

### Graceful Degradation & Standalone Operation
- The Next.js middleware and Supabase initialization layers feature robust fault tolerance. If database services are unreachable or deleted, non-authenticated public routes (Landing Page, Marketing Tools) fail gracefully without throwing 500 runtime exceptions.

### Zero Secrets Exposure Strategy
- Strict separation of environment configuration. All secrets (`GROQ_API_KEY`, `SUPABASE_SERVICE_KEY`, `GMAIL_APP_PASSWORD`) are strictly isolated in `.env.local` which is enforced in `.gitignore`.
- Reference setup is maintained in `.env.example`.

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.0.0` or higher
- **npm**, **yarn**, or **pnpm**
- **Groq API Key**: Obtainable via [console.groq.com](https://console.groq.com)
- **Supabase Project** (Optional for full backend features)

### Installation & Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/latexo.git
   cd latexo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to create `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your required environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GROQ_API_KEY=gsk_your_groq_api_key
   ```

4. **Execute Database Migrations** (Optional):
   Apply SQL scripts from `supabase/` to your Supabase SQL editor:
   - `supabase/migration.sql`
   - `supabase/simulations_migration.sql`
   - `supabase/session_workflow_migration.sql`
   - `supabase/arena_revamp_migration.sql`

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Access [http://localhost:3000](http://localhost:3000) in your browser.

6. **Build for Production**:
   ```bash
   npm run build
   npm run start
   ```

---

## Environment & Maintenance Configuration

To activate or deactivate site maintenance mode, configure `NEXT_PUBLIC_MAINTENANCE_MODE` in `.env.local`:

```env
# Set to "true" to lock site to maintenance view, or "false" for standard operation
NEXT_PUBLIC_MAINTENANCE_MODE="false"
```

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
