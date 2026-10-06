export const codingCategories = [
  {
    id: "frontend",
    label: "FRONT-END",
    description: "화면과 사용자 경험을 만드는 기록",
  },
  {
    id: "backend",
    label: "BACK-END",
    description: "데이터와 서비스의 흐름을 설계하는 기록",
  },
  {
    id: "infrastructure",
    label: "SERVER-INFRA",
    description: "서버와 시스템을 구축하고 운영하는 기록",
  },
  {
    id: "network",
    label: "NETWORK",
    description: "연결과 통신의 원리를 살펴보는 기록",
  },
] as const;

export type CodingCategory = (typeof codingCategories)[number]["id"];

export type CodingSection = {
  id: string;
  title: string;
  paragraphs: readonly string[];
  code?: { language: string; value: string };
};

export type CodingPost = {
  slug: string;
  title: string;
  description: string;
  category: CodingCategory;
  icon: "code" | "server" | "globe" | "ubuntu" | "rocky";
  publishedAt: string;
  updatedAt: string;
  tags: readonly string[];
  sections: readonly CodingSection[];
  isExample?: boolean;
};

type CodingFilters = {
  category?: CodingCategory;
  query?: string;
  tag?: string;
  tags?: readonly string[];
};

function firstValue(value?: string | string[]): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function getCodingCategory(value?: string | string[]) {
  const id = firstValue(value).trim();
  return codingCategories.find((category) => category.id === id);
}

export function normalizeCodingQuery(value?: string | string[]): string {
  // Count complete characters so a long query cannot split a surrogate pair.
  return Array.from(firstValue(value).normalize("NFC").trim())
    .slice(0, 100)
    .join("")
    .trim();
}

export function normalizeCodingTags(
  value?: string | readonly string[],
): string[] {
  const values = typeof value === "string" ? [value] : (value ?? []);
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const value of values) {
    const tag = normalizeCodingQuery(value);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

export function getCodingTags(
  posts: readonly CodingPost[],
  { category }: Pick<CodingFilters, "category"> = {},
): string[] {
  const tags = posts
    .filter((post) => !category || post.category === category)
    .flatMap((post) => post.tags);
  return normalizeCodingTags(tags).sort((a, b) =>
    a.localeCompare(b, "ko", { sensitivity: "base" }),
  );
}

function updatedTimestamp(post: CodingPost): number {
  const timestamp = Date.parse(post.updatedAt);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function filterCodingPosts(
  posts: readonly CodingPost[],
  { category, query, tag, tags }: CodingFilters = {},
): CodingPost[] {
  const normalizedQuery = normalizeCodingQuery(query).toLowerCase();
  const normalizedTags = normalizeCodingTags([
    ...(tag ? [tag] : []),
    ...(tags ?? []),
  ]).map((tag) => tag.toLowerCase());
  const matchWordPrefix = /^[a-z]$/.test(normalizedQuery);

  return posts
    .filter((post) => {
      if (category && post.category !== category) return false;
      if (normalizedTags.length) {
        const postTags = new Set(
          normalizeCodingTags(post.tags).map((tag) => tag.toLowerCase()),
        );
        if (!normalizedTags.every((tag) => postTags.has(tag))) return false;
      }
      if (!normalizedQuery) return true;

      if (matchWordPrefix) {
        return [post.title, post.description, ...post.tags].some((value) =>
          value
            .normalize("NFC")
            .toLowerCase()
            .split(/[^\p{L}\p{N}]+/u)
            .some((word) => word.startsWith(normalizedQuery)),
        );
      }

      const searchableText = [
        post.title,
        post.description,
        ...post.tags,
        ...post.sections.flatMap((section) => [
          section.title,
          ...section.paragraphs,
          section.code?.value ?? "",
        ]),
      ]
        .join("\n")
        .normalize("NFC")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    })
    .sort(
      (a, b) =>
        updatedTimestamp(b) - updatedTimestamp(a) ||
        a.slug.localeCompare(b.slug, "en"),
    );
}

export function codingListHref({
  category,
  query,
  tag,
  tags,
}: CodingFilters = {}): string {
  const params = new URLSearchParams();
  const selectedCategory = getCodingCategory(category);
  const normalizedQuery = normalizeCodingQuery(query);
  const normalizedTags = normalizeCodingTags([
    ...(tag ? [tag] : []),
    ...(tags ?? []),
  ]);

  if (selectedCategory) params.set("category", selectedCategory.id);
  if (normalizedQuery) params.set("q", normalizedQuery);
  for (const tag of normalizedTags) params.append("tag", tag);

  const search = params.toString();
  return search ? `/coding?${search}` : "/coding";
}
