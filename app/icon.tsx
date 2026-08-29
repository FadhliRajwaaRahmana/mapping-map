import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#1e293b",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 11,
            top: 11,
            width: 10,
            height: 10,
            borderRadius: 5,
            background: "#3b82f6",
            border: "1.5px solid #60a5fa",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 3,
            top: 4,
            width: 7,
            height: 7,
            borderRadius: 4,
            background: "#fff",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 3,
            top: 4,
            width: 7,
            height: 7,
            borderRadius: 4,
            background: "#c084fc",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 13,
            bottom: 3,
            width: 7,
            height: 7,
            borderRadius: 4,
            background: "#22c55e",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
