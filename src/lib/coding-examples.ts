import type { CodingPost, CodingSection } from "./coding";

function exampleSections(platform: string): readonly CodingSection[] {
  return [
    {
      id: "overview",
      title: "개요",
      paragraphs: [
        "익숙한 도메인 이름 뒤에는 서버의 주소를 찾아가는 과정이 있습니다. DNS는 이름과 주소를 연결해, 우리가 숫자로 된 IP 주소를 일일이 기억하지 않아도 서비스를 찾을 수 있게 합니다.",
        `${platform}에서 DNS를 다룰 때는 먼저 이름을 조회하는 도구와 DNS 응답을 제공하는 서버의 역할을 구분합니다. 이 기록은 도구 준비, 이름 조회, 결과 확인의 순서로 구성한 예시입니다.`,
        "설정을 바꾸는 것만큼 중요한 것은 결과를 읽는 일입니다. 어떤 서버에 질의했는지, 어떤 응답을 받았는지 차근차근 확인해 봅니다.",
      ],
    },
    {
      id: "install",
      title: "DNS 패키지 설치",
      paragraphs: [
        `${platform}의 배포판과 버전에 맞는 도구를 준비하고, 사용한 패키지와 버전을 함께 기록합니다. 설치 과정의 세부 명령은 실제 사용 환경에 맞춰 작성할 부분입니다.`,
        "도구를 준비했다면 dig로 도메인에 질의를 보내 볼 수 있습니다. 아래는 example.com의 DNS 응답을 살펴보는 간단한 예시입니다.",
      ],
      code: {
        language: "Bash",
        value: "# 도메인의 DNS 응답 살펴보기\ndig example.com",
      },
    },
    {
      id: "verify",
      title: "설정 확인",
      paragraphs: [
        "조회가 끝나면 응답 내용과 질의에 사용한 서버를 확인합니다. 기대한 결과와 다르다면 도메인 이름, 조회 대상, 사용 중인 DNS 설정을 순서대로 살펴봅니다.",
        "+short 옵션은 결과를 간결하게 보여 줍니다. 전체 응답을 읽을 때와 결과만 빠르게 확인할 때를 구분하면 기록도 더 명확해집니다.",
      ],
      code: {
        language: "Bash",
        value: "# 조회 결과를 간결하게 확인하기\ndig example.com +short",
      },
    },
  ];
}

// These dates and records are design fixtures, not publication history. This
// module is imported only by the explicitly enabled local development preview.
// Lookup examples: https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility
export const codingExamplePosts: readonly CodingPost[] = [
  {
    slug: "example-ubuntu-dns",
    title: "Ubuntu에서의 DNS",
    description: "Ubuntu에서 DNS 설치와 설정, 예외 사항을 다룹니다.",
    category: "infrastructure",
    icon: "ubuntu",
    publishedAt: "2026-10-06T09:00:00+09:00",
    updatedAt: "2026-10-06T09:00:00+09:00",
    tags: ["Ubuntu", "DNS", "Linux"],
    sections: exampleSections("Ubuntu"),
    isExample: true,
  },
  {
    slug: "example-rocky-dns",
    title: "Rocky에서의 DNS",
    description: "Rocky에서 DNS 설치와 설정, 예외 사항을 다룹니다.",
    category: "infrastructure",
    icon: "rocky",
    publishedAt: "2026-10-05T09:00:00+09:00",
    updatedAt: "2026-10-05T09:00:00+09:00",
    tags: ["Rocky Linux", "DNS", "Linux"],
    sections: exampleSections("Rocky Linux"),
    isExample: true,
  },
  {
    slug: "example-dns",
    title: "DNS",
    description: "DNS에 대한 정보입니다.",
    category: "network",
    icon: "globe",
    publishedAt: "2026-10-04T09:00:00+09:00",
    updatedAt: "2026-10-04T09:00:00+09:00",
    tags: ["DNS", "네트워크"],
    sections: exampleSections("네트워크 학습"),
    isExample: true,
  },
];
