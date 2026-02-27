import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().min(1).optional(),
  RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
  EMAIL_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  EMAIL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
});

export const env = EnvSchema.parse(process.env);
