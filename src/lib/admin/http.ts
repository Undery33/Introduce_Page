import { Prisma } from "@prisma/client";

import { AdminError } from "./errors";
export { AdminError } from "./errors";
export function adminJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
export async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new AdminError(415, "JSON 형식으로 요청해야 합니다.");
  const limit = 256 * 1024;
  if (Number(request.headers.get("content-length")) > limit)
    throw new AdminError(413, "글의 크기가 제한을 초과했습니다.");
  const reader = request.body?.getReader();
  if (!reader) throw new AdminError(400, "입력 내용을 확인하십시오.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new AdminError(413, "글의 크기가 제한을 초과했습니다.");
      }
      chunks.push(chunk.value);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new AdminError(400, "입력 내용을 확인하십시오.");
    }
  } finally {
    reader.releaseLock();
  }
}
export function adminFailure(error: unknown) {
  if (error instanceof AdminError)
    return adminJson({ error: error.message }, error.status);
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    return adminJson(
      { error: "이미 사용 중인 글 주소입니다. 다른 주소를 입력하십시오." },
      409,
    );
  // Deliberately omit DB URLs, query parameters, input text and stack traces.
  return adminJson(
    {
      error:
        "저장소에 연결하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도하십시오.",
    },
    503,
  );
}
