import { getDatabase } from "@/lib/db";
import { authConfiguration } from "@/lib/admin/security";
import { checkMediaDirectory } from "@/lib/admin/images";
export const dynamic = "force-dynamic";
export async function GET() {
  let database = "not-connected";
  if (process.env.DATABASE_URL) {
    try {
      await Promise.all([
        getDatabase().codingPost.count(),
        getDatabase().adminSession.count(),
        getDatabase().uploadedImage.count(),
        getDatabase().vrchatPhoto.count(),
      ]);
      database = "ok";
    } catch {
      database = "unavailable";
    }
  }
  let media = "not-configured";
  if (process.env.MEDIA_DIRECTORY) {
    try {
      await checkMediaDirectory();
      media = "ok";
    } catch {
      media = "unavailable";
    }
  }
  const degraded = database === "unavailable" || media === "unavailable";
  return Response.json(
    {
      status: degraded ? "degraded" : "ok",
      service: "undery-site",
      stage: "admin-media",
      commit: process.env.BUILD_COMMIT ?? "local",
      checks: {
        application: "ok",
        database,
        media,
        authentication: authConfiguration() ? "configured" : "not-configured",
      },
    },
    {
      status: degraded ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
