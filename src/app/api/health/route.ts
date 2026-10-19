import { getDatabase } from "@/lib/db";
import { authConfiguration } from "@/lib/admin/security";
export const dynamic = "force-dynamic";
export async function GET() {
  let database = "not-connected";
  if (process.env.DATABASE_URL) {
    try {
      await Promise.all([
        getDatabase().codingPost.count(),
        getDatabase().adminSession.count(),
      ]);
      database = "ok";
    } catch {
      database = "unavailable";
    }
  }
  return Response.json(
    {
      status: database === "unavailable" ? "degraded" : "ok",
      service: "undery-site",
      stage: "admin-content",
      commit: process.env.BUILD_COMMIT ?? "local",
      checks: {
        application: "ok",
        database,
        authentication: authConfiguration() ? "configured" : "not-configured",
      },
    },
    {
      status: database === "unavailable" ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
