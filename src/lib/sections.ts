export const sections = {
  coding: {
    name: "Coding",
    eyebrow: "DEVELOPMENT JOURNAL",
    path: "/coding",
    description: "코드와 시스템을 이해하고, 배운 것을 기록합니다.",
    navigation: [
      { label: "전체 기록", href: "/coding" },
      { label: "분류", href: "/coding#categories" },
    ],
    sitemap: ["/coding"],
  },
  game: {
    name: "Game",
    eyebrow: "PLAY & COLLECT",
    path: "/game",
    description: "함께 플레이하고, 오래 기억할 순간을 모읍니다.",
    navigation: [
      { label: "게임 홈", href: "/game" },
      { label: "하이라이트", href: "/game/highlights" },
      { label: "사진첩", href: "/game/gallery" },
    ],
    sitemap: ["/game", "/game/highlights", "/game/gallery"],
  },
  whoami: {
    name: "Whoami",
    eyebrow: "A LITTLE ABOUT ME",
    path: "/whoami",
    description: "나를 소개하는 말과, 함께 나눌 이야기를 모읍니다.",
    navigation: [
      { label: "소개", href: "/whoami#intro" },
      { label: "인적사항·성격", href: "/whoami#profile" },
      { label: "할 수 있는 것", href: "/whoami#skills" },
      { label: "강점", href: "/whoami#strengths" },
      { label: "댓글", href: "/whoami#comments" },
    ],
    sitemap: ["/whoami"],
  },
} as const;
export type Section = keyof typeof sections;

export const categories = [
  {
    id: "infrastructure",
    label: "서버·인프라",
    number: "01",
    description: "시스템을 구축하고 운영하는 이야기",
  },
  {
    id: "web",
    label: "프론트엔드·백엔드",
    number: "02",
    description: "화면부터 데이터까지, 웹을 만드는 과정",
  },
  {
    id: "network",
    label: "네트워크",
    number: "03",
    description: "연결과 통신의 원리를 살펴보는 기록",
  },
  {
    id: "programming",
    label: "프로그래밍·기타",
    number: "04",
    description: "언어와 도구를 배우며 남기는 메모",
  },
] as const;

export function isSectionLink(section: Section, href: string) {
  const base = sections[section].path;
  return (
    href === "/privacy" ||
    href === base ||
    href.startsWith(`${base}/`) ||
    href.startsWith(`${base}#`) ||
    href.startsWith(`${base}?`)
  );
}
