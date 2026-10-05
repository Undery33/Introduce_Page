import { ImageResponse } from "next/og";
export const alt = "UNDERY — WHOAMI / GAME / CODING";
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
        padding: 58,
        background: "#f2c14e",
        color: "#252720",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 23,
        }}
      >
        <span>undery.link</span>
        <span>A PERSONAL SPACE</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          fontSize: 185,
          fontWeight: 700,
          letterSpacing: -10,
        }}
      >
        UNDERY
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: "2px solid #252720",
          paddingTop: 25,
          fontSize: 24,
        }}
      >
        <span>WHOAMI / GAME / CODING</span>
        <span>ALWAYS A NEW BEGINNING</span>
      </div>
    </div>,
    size,
  );
}
