import type { HomeIconName } from "@/components/home-icon";

export const homeDestinations = [
  {
    path: "/whoami",
    title: "WHOAMI",
    label: "나에 대하여",
    description: "어떤 사람인지, 무엇을 좋아하는지. 나를 소개하는 이야기.",
    icon: "person",
  },
  {
    path: "/game",
    title: "GAME",
    label: "함께 즐기는 순간",
    description: "좋아하는 게임과 함께한 플레이, 오래 기억하고 싶은 순간들.",
    icon: "gamepad",
  },
  {
    path: "/coding",
    title: "CODING",
    label: "배우고 만드는 기록",
    description:
      "작은 호기심에서 시작한 코드. 배우고, 만들고, 해결해 가는 과정.",
    icon: "code",
  },
] as const;

type SocialLink = {
  name: string;
  icon: HomeIconName;
  // Set verified https: profile URLs or mailto: addresses when ready.
  // An unset address renders an explicitly disabled design placeholder.
  href: string | null;
};

export const homeSocials: readonly SocialLink[] = [
  { name: "Instagram", icon: "instagram", href: null },
  { name: "X / Twitter", icon: "x", href: null },
  { name: "Naver Mail", icon: "naver", href: null },
  { name: "Gmail", icon: "mail", href: null },
  { name: "GitHub", icon: "github", href: null },
];
