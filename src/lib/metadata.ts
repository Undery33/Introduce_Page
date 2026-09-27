import type { Metadata } from "next";
export const siteOrigin = process.env.SITE_URL || "https://undery.link";
export function pageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return {
    title: `${title} — UNDERY`,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} — UNDERY`,
      description,
      url: path,
      locale: "ko_KR",
      type: "website",
      images: [
        {
          url: `${path.split("/").slice(0, 2).join("/")}/opengraph-image`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}
