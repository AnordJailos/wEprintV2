/**
 * Configuration, read once and validated once.
 *
 * Anything missing or obviously wrong fails here, at first import, rather than
 * halfway through a customer's order. Mirrors the old Rust `AppConfig`.
 */
import { z } from "zod";

const schema = z.object({
  databaseUrl: z.string().min(1, "DATABASE_URL is required"),
  jwtSecret: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  jwtExpiresIn: z.string().default("7d"),
  publicBaseUrl: z.string().url(),
  corsAllowedOrigins: z.array(z.string()),
  aiServiceUrl: z.string().url(),
  internalApiKey: z.string().min(16, "INTERNAL_API_KEY must be at least 16 characters"),
  uploadDir: z.string().min(1),
  maxUploadBytes: z.number().int().positive(),
  studioWhatsappNumber: z.string().default(""),
  isProduction: z.boolean(),
});

export type AppConfig = z.infer<typeof schema>;

function build(): AppConfig {
  const env = process.env;
  const parsed = schema.safeParse({
    databaseUrl: env.DATABASE_URL ?? "",
    jwtSecret: env.JWT_SECRET ?? "",
    jwtExpiresIn: env.JWT_EXPIRES_IN ?? "7d",
    publicBaseUrl: env.PUBLIC_BASE_URL ?? "http://localhost:8080",
    corsAllowedOrigins: (env.CORS_ALLOWED_ORIGINS ?? "http://localhost:5173")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    aiServiceUrl: env.AI_SERVICE_URL ?? "http://127.0.0.1:8000",
    internalApiKey: env.INTERNAL_API_KEY ?? "",
    uploadDir: env.UPLOAD_DIR ?? "./uploads",
    maxUploadBytes: Number(env.MAX_UPLOAD_BYTES ?? 26_214_400),
    studioWhatsappNumber: env.STUDIO_WHATSAPP_NUMBER ?? "",
    isProduction: env.NODE_ENV === "production",
  });

  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid backend configuration — ${detail}`);
  }

  // A wildcard CORS origin plus bearer tokens is how credentials leak. Refuse.
  if (parsed.data.isProduction && parsed.data.corsAllowedOrigins.includes("*")) {
    throw new Error("CORS_ALLOWED_ORIGINS must list explicit origins in production");
  }
  return parsed.data;
}

let cached: AppConfig | null = null;

/** Lazily built so importing a module never explodes during `next build`. */
export function config(): AppConfig {
  cached ??= build();
  return cached;
}
