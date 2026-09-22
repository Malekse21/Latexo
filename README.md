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

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
