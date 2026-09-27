export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "undery-site",
      stage: "foundation",
      commit: process.env.BUILD_COMMIT ?? "local",
      checks: {
        application: "ok",
        database: "not-connected",
        authentication: "not-configured",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
