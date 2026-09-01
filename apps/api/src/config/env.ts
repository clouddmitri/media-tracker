import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  CORS_ORIGIN: z.url(),
  TMDB_API_KEY: z.string().min(1),
  TMDB_READ_TOKEN: z.string().min(1),
  OMDB_API_KEY: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:\n");
  for (const issue of parsed.error.issues) {
    console.error(`${issue.path.join(".")}: ${issue.message}`);
  }
  console.error("\nCheck your .env file against .env.example.\n");
  process.exit(1);
}

export const env: Env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
