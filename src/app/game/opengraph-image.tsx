import { ImageResponse } from "next/og";
export const alt = "VALORANT / VRCHAT";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#ffffff",
        color: "#171a20",
        padding: "52px 68px",
      }}
    >
      <svg
        width="1200"
        height="630"
        viewBox="0 0 1200 630"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <path d="M 680 0 H 1200 V 630 H 510 Z" fill="#F2C14E" />
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, color: "#ff4655" }}>
          VALORANT
        </div>
      </div>
      <div
        style={{
          display: "flex",
          position: "relative",
          fontSize: 72,
          fontWeight: 700,
        }}
      >
        VRCHAT
      </div>
    </div>,
    size,
  );
}
