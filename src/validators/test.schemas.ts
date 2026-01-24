import { z } from "zod";

/**
 * Request body:
 * - email: who receives the pay link
 * - amountCents: e.g. 1800 for $18.00
 * - giftName: "James Birthday Gift"
 * - note: optional (shows in email; not in Stripe line item)
 */
export const CreateSessionSchema = z.object({
  email: z.string().email(),
  amountCents: z.number().int().positive().max(500_00),
  currency: z.string().default("usd"),
  giftName: z.string().min(1).max(120),
  note: z.string().max(500).optional(),
});

// this helps define invalid/ valid requests (e.g. email is required here!)
// returns 400 with validation error (meaning schema is applied)
