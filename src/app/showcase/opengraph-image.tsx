import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Portfolio | Full-Stack Developer & AI Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: "64px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-2px",
            }}
          >
            Portfolio
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 500,
              color: "#7c3aed",
            }}
          >
            Full-Stack Developer & AI Engineer
          </div>
          <div
            style={{
              fontSize: "20px",
              color: "#888888",
              marginTop: "8px",
            }}
          >
            AI and data for the future of business
          </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "24px",
            }}
          >
            {["Next.js", "TypeScript", "Python", "FastAPI", "DuckDB"].map(
              (tech) => (
                <div
                  key={tech}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "20px",
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#e0e0e0",
                    fontSize: "14px",
                  }}
                >
                  {tech}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
