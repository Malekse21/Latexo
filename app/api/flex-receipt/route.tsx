import { NextRequest } from "next/server";
import { ImageResponse } from "@vercel/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

// Admin client (bypasses RLS) — safe for server-only edge route
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const simulationId = searchParams.get("simulation_id");

    if (!simulationId) {
      return new Response("Missing simulation_id parameter", { status: 400 });
    }

    // ── Fetch data ──────────────────────────────────────────
    const supabase = getAdminClient();

    const { data: simulation, error } = await supabase
      .from("simulations")
      .select("final_grade, created_at, user_id, evaluation, duration_minutes, mention, jury_feedback, feedback")
      .eq("id", simulationId)
      .single();

    if (error || !simulation) {
      return new Response("Simulation not found", { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("university, full_name, specialty")
      .eq("id", simulation.user_id)
      .single();

    // ── Derived values ──────────────────────────────────────
    const fullName = profile?.full_name || "Student";
    const university = profile?.university || "University";
    const specialty = profile?.specialty || "";
    const date = new Date(simulation.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const duration = simulation.duration_minutes || 15;
    const grade = simulation.final_grade?.toFixed(1) || "0.0";
    const gradeNum = simulation.final_grade || 0;

    const mention =
      simulation.mention ||
      (gradeNum >= 16
        ? "Très Bien"
        : gradeNum >= 14
        ? "Bien"
        : gradeNum >= 12
        ? "Assez Bien"
        : gradeNum >= 10
        ? "Passable"
        : "Ajourné");

    const proficiency = simulation.evaluation?.proficiency || {
      tech: 0,
      acad: 0,
      biz: 0,
    };

    const { origin } = new URL(request.url);

    // Pick the best jury quote from the highest scoring axis
    const axes = [
      { key: "tech", name: "Malek", title: "Technical Expert", score: proficiency.tech, image: "/jury/technical-expert.png", bgColor: "#cffafe" },
      { key: "strict", name: "Souad", title: "Strict Academic", score: proficiency.acad, image: "/jury/strict-academic.png", bgColor: "#f3e8ff" },
      { key: "business", name: "Amir", title: "Business Strategist", score: proficiency.biz, image: "/jury/business-strategist.png", bgColor: "#fef3c7" },
    ];
    const bestAxis = axes.sort((a, b) => b.score - a.score)[0];
    
    const feedback = simulation.feedback || simulation.jury_feedback || {};
    const bestQuote =
      (feedback as any)[bestAxis.key]?.comment ||
      (feedback as any)[`${bestAxis.key}_quote`] ||
      "Solid performance overall.";

    // Short simulation ID for receipt
    const simIdShort = simulationId.slice(0, 8).toUpperCase();

    // ── Load Inter font ─────────────────────────────────────
    const interBold = await fetch(
      "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf"
    ).then((res) => res.arrayBuffer());

    const interRegular = await fetch(
      "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
    ).then((res) => res.arrayBuffer());

    const stixBold = await fetch(
      "https://fonts.gstatic.com/s/stixtwotext/v18/YA9Gr02F12Xkf5whdwKf11l0jbKkeidMTtZ5YiiH3iOY.ttf"
    ).then((res) => res.arrayBuffer());

    // ── Build progress bar helper ───────────────────────────
    const ProgressBar = ({ label, value }: { label: string; value: number }) => (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>
            {label}
          </span>
          <span style={{ fontSize: "22px", fontWeight: 700, fontFamily: "Inter" }}>
            {value}%
          </span>
        </div>
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "16px",
            backgroundColor: "#EBE8E0",
            border: "2px solid #000",
          }}
        >
          <div
            style={{
              width: `${Math.min(value, 100)}%`,
              height: "100%",
              backgroundColor: "#000",
            }}
          />
        </div>
      </div>
    );

    // ── Render receipt ───────────────────────────────────────
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#F9F6EE",
            padding: "70px 60px",
            fontFamily: "Inter",
            color: "#000",
          }}
        >
          {/* ═══ RECEIPT HEADER ═══ */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              gap: "12px",
            }}
          >
            <div
              style={{
                fontSize: "64px",
                fontWeight: 700,
                fontFamily: "STIX Two Text",
                letterSpacing: "0.15em",
                textTransform: "uppercase" as const,
              }}
            >
              LATEXO
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "0.3em",
                textTransform: "uppercase" as const,
                color: "#666",
              }}
            >
              DEFENSE RECEIPT
            </div>
            <div style={{ width: "100%", height: "3px", backgroundColor: "#000", marginTop: "8px" }} />
          </div>

          {/* ═══ STUDENT INFO BLOCK ═══ */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              marginTop: "36px",
              padding: "0 10px",
            }}
          >
            {[
              { label: "STUDENT", value: fullName },
              { label: "UNIVERSITY", value: university },
              ...(specialty ? [{ label: "SPECIALTY", value: specialty }] : []),
              { label: "DATE", value: date },
              { label: "DURATION", value: `${duration} min` },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px dashed #CCC",
                  paddingBottom: "10px",
                }}
              >
                <span style={{ fontSize: "18px", fontWeight: 400, color: "#888", letterSpacing: "0.08em" }}>
                  {item.label}
                </span>
                <span style={{ fontSize: "20px", fontWeight: 700, textAlign: "right" as const, maxWidth: "60%" }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* ═══ THICK DIVIDER ═══ */}
          <div style={{ width: "100%", height: "4px", backgroundColor: "#000", marginTop: "36px" }} />

          {/* ═══ HERO SCORE ═══ */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "44px",
              gap: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
              <span
                style={{
                  fontSize: "160px",
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {grade}
              </span>
              <span style={{ fontSize: "60px", fontWeight: 400, color: "#999" }}>/20</span>
            </div>

            {/* Mention stamp */}
            <div
              style={{
                display: "flex",
                padding: "14px 40px",
                backgroundColor: gradeNum >= 10 ? "#000" : "#DC2626",
                color: "#FFF",
                fontSize: "28px",
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                transform: "rotate(-2deg)",
              }}
            >
              {mention}
            </div>
          </div>

          {/* ═══ DIVIDER ═══ */}
          <div style={{ width: "100%", height: "2px", backgroundColor: "#E5E5E5", marginTop: "40px" }} />

          {/* ═══ PERFORMANCE AXES ═══ */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              marginTop: "36px",
              padding: "0 10px",
            }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                letterSpacing: "0.25em",
                textTransform: "uppercase" as const,
                color: "#999",
                marginBottom: "4px",
              }}
            >
              PERFORMANCE AXES
            </div>
            <ProgressBar label="Technical" value={proficiency.tech} />
            <ProgressBar label="Academic" value={proficiency.acad} />
            <ProgressBar label="Business" value={proficiency.biz} />
          </div>

          {/* ═══ DIVIDER ═══ */}
          <div style={{ width: "100%", height: "2px", backgroundColor: "#E5E5E5", marginTop: "36px" }} />

          {/* ═══ JURY QUOTE ═══ */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: "36px",
              padding: "0 10px",
              gap: "16px",
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                letterSpacing: "0.25em",
                textTransform: "uppercase" as const,
                color: "#999",
              }}
            >
              JURY VERDICT
            </div>
            <div
              style={{
                display: "flex",
                border: "2px solid #000",
                padding: "36px",
                gap: "36px",
                alignItems: "center",
                flex: 1,
                backgroundColor: "#F2EFE6",
              }}
            >
              {/* Avatar Box */}
              <div
                style={{
                  display: "flex",
                  width: "120px",
                  height: "120px",
                  backgroundColor: bestAxis.bgColor,
                  borderRadius: "50%",
                  border: "3px solid #000",
                  overflow: "hidden",
                  flexShrink: 0,
                  boxShadow: "6px 6px 0px rgba(0,0,0,1)",
                }}
              >
                <img
                  src={`${origin}${bestAxis.image}`}
                  width="120"
                  height="120"
                  style={{ objectFit: "cover" }}
                />
              </div>

              {/* Quote Box */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    lineHeight: 1.4,
                    letterSpacing: "-0.01em",
                  }}
                >
                  &ldquo;{bestQuote}&rdquo;
                </span>
                <span style={{ fontSize: "20px", fontWeight: 700, color: "#777", letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
                  — {bestAxis.name}, {bestAxis.title}
                </span>
              </div>
            </div>
          </div>

          {/* ═══ SPACER ═══ */}
          <div style={{ display: "flex", flex: 1 }} />

          {/* ═══ TEAR LINE ═══ */}
          <div
            style={{
              display: "flex",
              width: "100%",
              borderTop: "3px dashed #CCC",
              marginBottom: "28px",
            }}
          />

          {/* ═══ FOOTER: Latexo branding ═══ */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "10px 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  display: "flex",
                  width: "52px",
                  height: "52px",
                  backgroundColor: "#000",
                  color: "#FFF",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  fontWeight: 900,
                  borderRadius: "10px",
                }}
              >
                L
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "24px", fontWeight: 900, letterSpacing: "0.08em" }}>
                  LATEXO
                </span>
                <span style={{ fontSize: "15px", color: "#888", fontWeight: 700 }}>
                  AI SIMULATOR
                </span>
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>
              <span style={{ fontSize: "14px", color: "#BBB", fontFamily: "monospace" }}>
                SIM-{simIdShort}
              </span>
              <div
                style={{
                  display: "flex",
                  backgroundColor: "#000",
                  color: "#FFF",
                  padding: "12px 24px",
                  borderRadius: "30px",
                  fontSize: "18px",
                  fontWeight: 900,
                  letterSpacing: "0.05em",
                }}
              >
                TRY ON LATEXO.TN
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1920,
        fonts: [
          {
            name: "Inter",
            data: interRegular,
            style: "normal" as const,
            weight: 400 as const,
          },
          {
            name: "STIX Two Text",
            data: stixBold,
            style: "normal" as const,
            weight: 700 as const,
          },
        ],
      }
    );
  } catch (error) {
    console.error("Flex receipt generation error:", error);
    return new Response(`Failed to generate receipt: ${error}`, { status: 500 });
  }
}
