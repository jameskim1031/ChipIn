import { z } from "zod";

export const CreateGiftSchema = z.object({
  name: z.string().min(1).max(120),
  totalPriceCents: z.number().int().positive().max(50_000_00),
  currency: z.string().default("usd"),
});

export const AddInviteesSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(100),
});
