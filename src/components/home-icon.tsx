import type { SVGProps } from "react";

export type HomeIconName =
  | "arrow-down"
  | "arrow-up-right"
  | "restart"
  | "person"
  | "gamepad"
  | "code"
  | "instagram"
  | "x"
  | "naver"
  | "mail"
  | "github";

export function HomeIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: HomeIconName }) {
  const paths = {
    "arrow-down": <path d="M12 4v16M5 13l7 7 7-7" />,
    "arrow-up-right": <path d="M5 19 19 5M5 5h14v14" />,
    restart: <path d="M4 10a8 8 0 1 1 1.8 7M4 4v6h6" />,
    person: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
      </>
    ),
    gamepad: (
      <>
        <path d="M7 7h10a4 4 0 0 1 4 3l1 8a2.5 2.5 0 0 1-4 2l-3-3H9l-3 3a2.5 2.5 0 0 1-4-2l1-8a4 4 0 0 1 4-3Z" />
        <path d="M6 10v5m-2.5-2.5h5M16 11h.01M19 14h.01M9 7V4h6" />
      </>
    ),
    code: <path d="m7 6-6 6 6 6M17 6l6 6-6 6M14 3l-4 18" />,
    instagram: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5h.01" />
      </>
    ),
    x: (
      <>
        <path d="M4 3h4l12 18h-4L4 3ZM4 21l7-8M13 11l7-8" />
      </>
    ),
    naver: (
      <path
        d="M4 21V3h5l6 9V3h5v18h-5l-6-9v9Z"
        fill="currentColor"
        stroke="none"
      />
    ),
    mail: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="m3 6 9 7 9-7" />
      </>
    ),
    github: (
      <path d="M8.5 21c-4.5 1.3-4.5-2-6.3-2.5M15.5 22v-4a3.5 3.5 0 0 0-1-2.7c3.3-.4 6.5-1.6 6.5-7A5.4 5.4 0 0 0 19.5 4.5 5 5 0 0 0 19.4 1S18.1.6 15.5 2.4a13.5 13.5 0 0 0-7 0C5.9.6 4.6 1 4.6 1a5 5 0 0 0-.1 3.5A5.4 5.4 0 0 0 3 8.3c0 5.4 3.2 6.6 6.5 7A3.5 3.5 0 0 0 8.5 18v4" />
    ),
  };
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
