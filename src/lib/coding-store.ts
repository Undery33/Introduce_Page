import type { CodingPost } from "./coding";

// Server-side data access only: import from route modules, never client UI.
// Keep the shared filters/types in coding.ts free of this preview dependency.
export function isCodingPreviewEnabled(
  environment: { NODE_ENV?: string; CODING_PREVIEW?: string } = process.env,
): boolean {
  return (
    environment.NODE_ENV === "development" && environment.CODING_PREVIEW === "1"
  );
}

export async function getCodingPosts(): Promise<readonly CodingPost[]> {
  if (isCodingPreviewEnabled()) {
    const { codingExamplePosts } = await import("./coding-examples");
    return codingExamplePosts;
  }

  // Replace only this empty public-post adapter with an explicit DTO query when
  // the DB is ready. Development examples must never be a DB fallback or seed.
  return [];
}
