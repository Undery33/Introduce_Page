type Visibility = { isPublic: boolean; position: number };
export type ProfileSnapshot = {
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  displayName: string;
  tagline: string | null;
  introduction: string | null;
  interests: string[];
  mbti: string | null;
  mbtiPublic: boolean;
  personality: string[];
  fields: (Visibility & { label: string; value: string })[];
  skills: (Visibility & {
    title: string;
    category: string;
    tools: string[];
    task: string;
    level: string;
    evidence: string | null;
  })[];
  strengths: (Visibility & {
    title: string;
    description: string;
    example: string;
    evidence: string | null;
  })[];
};

function publicItems<T extends Visibility>(items: T[]): T[] {
  return items
    .filter((item) => item.isPublic)
    .sort((a, b) => a.position - b.position);
}
// Evidence may point to an external public project, never another site section.
export function externalEvidence(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      ["undery.link", "www.undery.link"].includes(url.hostname.toLowerCase())
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

// Construct an allow-listed DTO; never spread database rows into public output.
export function publicProfile(profile: ProfileSnapshot | null) {
  if (!profile || profile.status !== "PUBLISHED") return null;
  return {
    displayName: profile.displayName,
    tagline: profile.tagline,
    introduction: profile.introduction,
    interests: profile.interests,
    mbti: profile.mbtiPublic ? profile.mbti : null,
    personality: profile.personality,
    fields: publicItems(profile.fields).map((item) => ({
      label: item.label,
      value: item.value,
    })),
    skills: publicItems(profile.skills).map((item) => ({
      title: item.title,
      category: item.category,
      tools: item.tools,
      task: item.task,
      level: item.level,
      evidence: externalEvidence(item.evidence),
    })),
    strengths: publicItems(profile.strengths).map((item) => ({
      title: item.title,
      description: item.description,
      example: item.example,
      evidence: externalEvidence(item.evidence),
    })),
  };
}
