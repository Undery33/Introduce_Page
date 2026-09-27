export const commentLimits = {
  nicknameMin: 2,
  nicknameMax: 20,
  bodyMax: 1000,
} as const;
// Unicode code points, shared between future browser and server validators.
export function characterCount(value: string) {
  return Array.from(value).length;
}
export function validateComment(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return { ok: false as const, error: "올바른 댓글 형식이 아닙니다." };
  const record = input as Record<string, unknown>;
  if (typeof record.nickname !== "string" || typeof record.body !== "string")
    return { ok: false as const, error: "닉네임과 댓글을 입력해 주세요." };
  const nickname = record.nickname.trim();
  const body = record.body.trim();
  if (characterCount(nickname) < 2 || characterCount(nickname) > 20)
    return { ok: false as const, error: "닉네임은 2–20자로 입력해 주세요." };
  if (!body || characterCount(body) > 1000)
    return { ok: false as const, error: "댓글은 1–1,000자로 입력해 주세요." };
  return { ok: true as const, data: { nickname, body } };
}
