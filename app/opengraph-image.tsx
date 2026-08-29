import { ImageResponse } from "next/og";

export const alt = "Mapping — Mind map interaktif";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: "#f8fafc",
          padding: 48,
          position: "relative",
        }}
      >
        {/* Grid pattern - simulated with border trick */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            opacity: 0.06,
          }}
        />

        {/* Top bar: logo + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: "#1e293b",
              border: "2px solid #1e293b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Mini mind map icon */}
            <div
              style={{
                position: "absolute",
                left: 14,
                top: 12,
                width: 14,
                height: 14,
                borderRadius: 7,
                background: "#3b82f6",
                border: "1.5px solid #60a5fa",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 5,
                top: 6,
                width: 8,
                height: 8,
                borderRadius: 4,
                background: "#fff",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 5,
                top: 6,
                width: 8,
                height: 8,
                borderRadius: 4,
                background: "#c084fc",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 17,
                bottom: 5,
                width: 8,
                height: 8,
                borderRadius: 4,
                background: "#22c55e",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#1e293b",
              letterSpacing: -0.5,
            }}
          >
            Mapping
          </span>
          <span
            style={{
              marginLeft: 8,
              fontSize: 12,
              fontWeight: 600,
              color: "#64748b",
              background: "#e2e8f0",
              padding: "4px 10px",
              borderRadius: 20,
            }}
          >
            Mind map kolaboratif
          </span>
        </div>

        {/* Hero text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 48,
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 900,
              color: "#1e293b",
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            Petakan ide &amp;
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 900,
              color: "#3b82f6",
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            catatan teknismu
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              color: "#64748b",
              marginTop: 8,
              maxWidth: 640,
              lineHeight: 1.5,
            }}
          >
            Mind map interaktif bergaya Excalidraw. Kanvas tak terbatas,
            detail Markdown, kolaborasi real-time.
          </div>
        </div>

        {/* Bottom: brutalist pills */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#3b82f6",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              padding: "12px 24px",
              borderRadius: 10,
              border: "2px solid #1e293b",
            }}
          >
            Coba Gratis →
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#fff",
              color: "#1e293b",
              fontSize: 15,
              fontWeight: 700,
              padding: "12px 24px",
              borderRadius: 10,
              border: "2px solid #1e293b",
            }}
          >
            mapping-map.vercel.app
          </div>
        </div>

        {/* Decorative brutalist card hint bottom-right */}
        <div
          style={{
            position: "absolute",
            right: 48,
            bottom: 48,
            width: 280,
            height: 160,
            background: "#fff",
            border: "2px solid #1e293b",
            borderRadius: 10,
            display: "flex",
            flexDirection: "column",
            padding: 16,
            gap: 8,
          }}
        >
          <div
            style={{
              width: "100%",
              height: 10,
              background: "#e2e8f0",
              borderRadius: 4,
            }}
          />
          <div
            style={{
              display: "flex",
              gap: 8,
            }}
          >
            <div
              style={{
                flex: 1,
                height: 60,
                background: "#3b82f6",
                opacity: 0.12,
                borderRadius: 6,
                border: "1.5px solid #3b82f6",
              }}
            />
            <div
              style={{
                flex: 1,
                height: 60,
                background: "#c084fc",
                opacity: 0.12,
                borderRadius: 6,
                border: "1.5px solid #c084fc",
              }}
            />
          </div>
          <div
            style={{
              width: "60%",
              height: 8,
              background: "#e2e8f0",
              borderRadius: 4,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
