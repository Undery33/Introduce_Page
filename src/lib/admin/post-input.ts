import { AdminError } from "./errors";

export const editorCategories = [
  "frontend",
  "backend",
  "infrastructure",
  "network",
] as const;
export const editorIcons = [
  "code",
  "server",
  "globe",
  "ubuntu",
  "rocky",
] as const;
export type EditorSection = { id: string; title: string; markdown: string };
export type PostInput = {
  slug: string;
  title: string;
  description: string;
  category: (typeof editorCategories)[number];
  icon: (typeof editorIcons)[number];
  tags: string[];
  sections: EditorSection[];
};
export type EditorDocument = PostInput & {
  id: string;
  version: number;
  publishedVersion: number | null;
  postId: string | null;
  publicStatus: string | null;
  updatedAt: string;
};
function text(
  value: unknown,
  label: string,
  max: number,
  required = true,
): string {
  if (typeof value !== "string")
    throw new AdminError(400, `${label}을(를) 확인하십시오.`);
  const result = value.normalize("NFC").trim();
  if (
    (required && !result) ||
    Array.from(result).length > max ||
    /\u0000/.test(result)
  )
    throw new AdminError(
      400,
      `${label}은(는) ${required ? "1" : "0"}~${max}자여야 합니다.`,
    );
  return result;
}
export function parsePostInput(value: unknown): PostInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new AdminError(400, "입력 내용을 확인하십시오.");
  const input = value as Record<string, unknown>;
  const slug = text(input.slug, "글 주소", 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new AdminError(
      400,
      "글 주소에는 영문 소문자·숫자·하이픈만 사용할 수 있습니다.",
    );
  if (!editorCategories.includes(input.category as PostInput["category"]))
    throw new AdminError(400, "분류를 선택하십시오.");
  if (!editorIcons.includes(input.icon as PostInput["icon"]))
    throw new AdminError(400, "아이콘을 선택하십시오.");
  if (!Array.isArray(input.tags) || input.tags.length > 12)
    throw new AdminError(400, "태그는 최대 12개입니다.");
  const seen = new Set<string>();
  const tags = input.tags
    .map((tag) => text(tag, "태그", 30))
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (
    !Array.isArray(input.sections) ||
    input.sections.length < 1 ||
    input.sections.length > 40
  )
    throw new AdminError(400, "챕터는 1~40개여야 합니다.");
  const ids = new Set<string>();
  const sections = input.sections.map((section: unknown) => {
    if (!section || typeof section !== "object")
      throw new AdminError(400, "챕터 내용을 확인하십시오.");
    const data = section as Record<string, unknown>;
    const id = text(data.id, "챕터 ID", 80);
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id))
      throw new AdminError(400, "챕터 ID는 고유해야 합니다.");
    ids.add(id);
    return {
      id,
      title: text(data.title, "챕터 제목", 120),
      markdown: text(data.markdown, "본문", 100000, false),
    };
  });
  if (
    sections.reduce((sum, section) => sum + section.markdown.length, 0) > 200000
  )
    throw new AdminError(400, "전체 본문이 너무 깁니다.");
  return {
    slug,
    title: text(input.title, "제목", 120),
    description: text(input.description, "요약", 300, false),
    category: input.category as PostInput["category"],
    icon: input.icon as PostInput["icon"],
    tags,
    sections,
  };
}
export function parseVersion(value: unknown): number {
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 1
  )
    throw new AdminError(400, "문서 버전이 올바르지 않습니다.");
  return value.version as number;
}
export function assertPublishable(input: PostInput): void {
  if (input.sections.some((section) => !section.markdown.trim()))
    throw new AdminError(400, "빈 챕터의 본문을 작성한 뒤 발행하십시오.");
}
