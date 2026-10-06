import type { SVGProps } from "react";

export type CodingIconName =
  | "search"
  | "file"
  | "arrow"
  | "github"
  | "clock"
  | "code"
  | "server"
  | "globe"
  | "ubuntu"
  | "rocky";

export function CodingIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: CodingIconName }) {
  if (name === "github")
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        {...props}
      >
        <path d="M12 .8a11.2 11.2 0 0 0-3.54 21.82c.56.1.77-.24.77-.54v-2.1c-3.12.68-3.78-1.33-3.78-1.33-.51-1.3-1.25-1.64-1.25-1.64-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.4-1.23.71-1.51-2.49-.29-5.11-1.25-5.11-5.55 0-1.22.44-2.22 1.15-3-.12-.29-.5-1.43.11-2.98 0 0 .94-.3 3.08 1.15a10.73 10.73 0 0 1 5.61 0c2.14-1.45 3.08-1.15 3.08-1.15.61 1.55.23 2.69.11 2.98.72.78 1.15 1.78 1.15 3 0 4.31-2.62 5.26-5.12 5.54.4.35.76 1.03.76 2.08v3.11c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z" />
      </svg>
    );
  if (name === "ubuntu")
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
        <circle cx="24" cy="24" r="23" fill="#ef6b20" />
        <circle
          cx="24"
          cy="24"
          r="11"
          fill="none"
          stroke="white"
          strokeWidth="3"
        />
        {[
          [10, 24],
          [31, 12],
          [31, 36],
        ].map(([cx, cy]) => (
          <circle
            key={cy}
            cx={cx}
            cy={cy}
            r="4"
            fill="white"
            stroke="#ef6b20"
            strokeWidth="2"
          />
        ))}
      </svg>
    );
  if (name === "rocky")
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
        <circle cx="24" cy="24" r="23" fill="#10b981" />
        <path d="m7 40 24-24 16 16-4 8-12-12-17 17Z" fill="white" />
      </svg>
    );
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {name === "search" && (
        <>
          <circle cx="10.5" cy="10.5" r="7.5" />
          <path d="m16 16 5 5" />
        </>
      )}
      {name === "file" && (
        <>
          <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z" />
          <path d="M14 3v5h5M9 12h6M9 16h4" />
        </>
      )}
      {name === "arrow" && <path d="M4 12h16m-6-6 6 6-6 6" />}
      {name === "clock" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )}
      {name === "code" && <path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16" />}
      {name === "server" && (
        <>
          <rect x="3" y="3" width="18" height="7" rx="2" />
          <rect x="3" y="14" width="18" height="7" rx="2" />
          <path d="M7 6.5h.01M7 17.5h.01M12 6.5h5M12 17.5h5" />
        </>
      )}
      {name === "globe" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
          <path d="M3 12h18M5 6.5a16 16 0 0 0 14 0M5 17.5a16 16 0 0 1 14 0" />
        </>
      )}
    </svg>
  );
}
