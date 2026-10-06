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

type CodingFilters = { category?: CodingCategory; query?: string };

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

function updatedTimestamp(post: CodingPost): number {
  const timestamp = Date.parse(post.updatedAt);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function filterCodingPosts(
  posts: readonly CodingPost[],
  { category, query }: CodingFilters = {},
): CodingPost[] {
  const normalizedQuery = normalizeCodingQuery(query).toLowerCase();

  return posts
    .filter((post) => {
      if (category && post.category !== category) return false;
      if (!normalizedQuery) return true;

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
}: CodingFilters = {}): string {
  const params = new URLSearchParams();
  const selectedCategory = getCodingCategory(category);
  const normalizedQuery = normalizeCodingQuery(query);

  if (selectedCategory) params.set("category", selectedCategory.id);
  if (normalizedQuery) params.set("q", normalizedQuery);

  const search = params.toString();
  return search ? `/coding?${search}` : "/coding";
}
