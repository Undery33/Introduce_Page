import { ImageResponse } from "next/og";
export const alt = "UNDERY / WHOAMI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        background: "#f5f3ed",
        color: "#282922",
        padding: 70,
      }}
    >
      <div style={{ fontSize: 24, letterSpacing: 8 }}>UNDERY</div>
      <div style={{ fontSize: 110, fontWeight: 700 }}>WHOAMI.</div>
      <div style={{ fontSize: 23 }}>undery.link/whoami</div>
    </div>,
    size,
  );
}
