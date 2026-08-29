import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#1e293b",
          borderRadius: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 72,
            top: 72,
            width: 36,
            height: 36,
            borderRadius: 18,
            background: "#3b82f6",
            border: "3px solid #60a5fa",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 24,
            top: 28,
            width: 28,
            height: 28,
            borderRadius: 14,
            background: "#fff",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 24,
            top: 28,
            width: 28,
            height: 28,
            borderRadius: 14,
            background: "#c084fc",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 76,
            bottom: 24,
            width: 28,
            height: 28,
            borderRadius: 14,
            background: "#22c55e",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
