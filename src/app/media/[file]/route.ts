import { adminSession } from "@/lib/admin/session";
import { isImagePublic, loadImage } from "@/lib/admin/images";
import { imageIdFromUrl } from "@/lib/media";
import { getDatabase } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> },
) {
  const { file } = await context.params;
  const url = `/media/${file}`;
  const id = imageIdFromUrl(url);
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  };
  if (!id || !process.env.DATABASE_URL)
    return new Response(null, { status: 404, headers });
  try {
    if (!(await adminSession()) && !(await isImagePublic(url)))
      return new Response(null, { status: 404, headers });
    if (
      !(await getDatabase().uploadedImage.findUnique({
        where: { id },
        select: { id: true },
      }))
    )
      return new Response(null, { status: 404, headers });
    const bytes = await loadImage(id);
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...headers,
        "Content-Type": "image/webp",
        "Content-Length": String(bytes.length),
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": `inline; filename="${file}"`,
      },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
