/**
 * Liveness + readiness in one call: the database must answer and the embedding
 * model must be loadable. Unauthenticated on purpose — it reveals nothing.
 */
import { ping } from "@/lib/db";
import { isModelReady } from "@/lib/embedder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [database, model] = await Promise.all([ping(), isModelReady()]);
  const healthy = database && model;
  return Response.json(
    { status: healthy ? "ok" : "degraded", database, model },
    { status: healthy ? 200 : 503 },
  );
}
