import { test } from "node:test";
import assert from "node:assert/strict";
import {
  publicProfile,
  externalEvidence,
  type ProfileSnapshot,
} from "../src/lib/public-profile";
import { validateComment, characterCount } from "../src/lib/comment-input";
import { sections, isSectionLink, type Section } from "../src/lib/sections";

const profile: ProfileSnapshot = {
  status: "PUBLISHED",
  displayName: "테스트",
  tagline: null,
  introduction: null,
  interests: [],
  mbti: "INTJ",
  mbtiPublic: false,
  personality: [],
  fields: [
    { label: "비공개 주소", value: "SECRET", isPublic: false, position: 0 },
    { label: "활동명", value: "테스트", isPublic: true, position: 1 },
  ],
  skills: [
    {
      title: "비공개 기술",
      category: "a",
      tools: [],
      task: "SECRET",
      level: "실습 경험",
      evidence: null,
      isPublic: false,
      position: 0,
    },
  ],
  strengths: [],
};
test("drafts and archived profiles are never projected", () => {
  assert.equal(publicProfile(null), null);
  for (const status of ["DRAFT", "ARCHIVED"] as const)
    assert.equal(publicProfile({ ...profile, status }), null);
});
test("public projection excludes private fields, MBTI, metadata and unknown fields", () => {
  const data = publicProfile({ ...profile, ...{ privateToken: "SECRET" } });
  assert.ok(data);
  assert.equal(data.mbti, null);
  assert.equal(data.fields.length, 1);
  assert.equal(data.skills.length, 0);
  assert.doesNotMatch(
    JSON.stringify(data),
    /SECRET|INTJ|isPublic|position|privateToken|PUBLISHED/,
  );
  assert.equal(publicProfile({ ...profile, mbtiPublic: true })?.mbti, "INTJ");
});
test("evidence permits only external HTTPS links", () => {
  for (const value of [
    "javascript:alert(1)",
    "/coding/example",
    "https://undery.link/coding/a",
    "https://www.undery.link/game",
    "https://user:pass@example.com",
    "http://example.com",
  ])
    assert.equal(externalEvidence(value), null);
  assert.equal(
    externalEvidence("https://github.com/Undery33"),
    "https://github.com/Undery33",
  );
});
test("section navigation and sitemaps never cross boundaries", () => {
  for (const section of Object.keys(sections) as Section[]) {
    for (const item of sections[section].navigation)
      assert.equal(isSectionLink(section, item.href), true);
    for (const path of sections[section].sitemap)
      assert.equal(isSectionLink(section, path), true);
    assert.equal(isSectionLink(section, "/"), false);
    assert.equal(
      isSectionLink(section, sections[section].path + "-other"),
      false,
    );
  }
});
test("comment limits trim whitespace and count Unicode consistently", () => {
  assert.equal(characterCount("가😀"), 2);
  const result = validateComment({
    nickname: " 가😀 ",
    body: " 안녕 ",
    role: "admin",
  });
  assert.deepEqual(result, {
    ok: true,
    data: { nickname: "가😀", body: "안녕" },
  });
  for (const value of [
    null,
    [],
    {},
    { nickname: 3, body: "a" },
    { nickname: " ", body: "a" },
    { nickname: "가", body: "a" },
    { nickname: "가".repeat(21), body: "a" },
    { nickname: "가나", body: " " },
    { nickname: "가나", body: "a".repeat(1001) },
  ])
    assert.equal(validateComment(value).ok, false);
  assert.equal(
    validateComment({ nickname: "가".repeat(20), body: "😀".repeat(1000) }).ok,
    true,
  );
});
