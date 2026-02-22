import { NextRequest } from "next/server";
import { ImageResponse } from "@vercel/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const simulationId = searchParams.get("simulation_id");

    if (!simulationId) {
      return new Response("Missing simulation_id parameter", { status: 400 });
    }

    // Fetch simulation data
    const supabase = await createClient();
    const { data: simulation, error } = await supabase
      .from("simulations")
      .select("final_grade, created_at, user_id, metrics")
      .eq("id", simulationId)
      .single();

    if (error || !simulation) {
      return new Response("Simulation not found", { status: 404 });
    }

    // Fetch user profile for university name
    const { data: profile } = await supabase
      .from("profiles")
      .select("university, full_name")
      .eq("id", simulation.user_id)
      .single();

    const university = profile?.university || "University";
    const fullName = profile?.full_name || "Student";
    const date = new Date(simulation.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const grade = simulation.final_grade.toFixed(1);
    const isPassing = simulation.final_grade >= 12;

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "white",
            padding: "80px",
            fontFamily: "Inter, sans-serif",
            border: "8px solid black",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div
              style={{
                fontSize: "60px",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textAlign: "center",
                marginBottom: "20px",
              }}
            >
              LATEXO SURVIVOR
            </div>
            <div
              style={{
                width: "200px",
                height: "4px",
                backgroundColor: "black",
              }}
            />
          </div>

          {/* Middle - Grade */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "40px",
            }}
          >
            <div
              style={{
                fontSize: "180px",
                fontWeight: 900,
                lineHeight: 1,
                display: "flex",
                alignItems: "baseline",
                gap: "20px",
              }}
            >
              <span>{grade}</span>
              <span style={{ fontSize: "80px", color: "#666" }}>/20</span>
            </div>

            {/* Stamp */}
            <div
              style={{
                display: "flex",
                padding: "20px 40px",
                border: `6px solid ${isPassing ? "black" : "#dc2626"}`,
                backgroundColor: isPassing ? "black" : "#dc2626",
                color: "white",
                fontSize: "36px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                transform: "rotate(-3deg)",
              }}
            >
              {isPassing ? "DEFENSE READY ✓" : "REVISION NEEDED"}
            </div>

            {/* Info */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                marginTop: "20px",
              }}
            >
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                {fullName}
              </div>
              <div
                style={{
                  fontSize: "24px",
                  color: "#666",
                  textAlign: "center",
                }}
              >
                {university}
              </div>
              <div
                style={{
                  fontSize: "20px",
                  color: "#999",
                  textAlign: "center",
                }}
              >
                {date}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
              width: "100%",
            }}
          >
            <div
              style={{
                width: "200px",
                height: "4px",
                backgroundColor: "black",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
              }}
            >
              {/* QR Code placeholder - In production, generate actual QR code */}
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  border: "4px solid black",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  textAlign: "center",
                }}
              >
                QR
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                  }}
                >
                  latexo.app
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#666",
                  }}
                >
                  Verified by Latexo AI
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1080,
      }
    );
  } catch (error) {
    console.error("Survivor card generation error:", error);
    return new Response("Failed to generate card", { status: 500 });
  }
}
