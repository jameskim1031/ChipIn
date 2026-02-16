import { z } from "zod";

export const CreateGiftSchema = z.object({
  name: z.string().min(1).max(120),
  totalPriceCents: z.number().int().positive().max(50_000_00),
  currency: z.string().default("usd"),
});

export const AddInviteesSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(100),
});

export const CreateInvitationLinkSchema = z
  .object({
    expiresAt: z.string().datetime().optional(),
    expiresInDays: z.number().int().min(1).max(365).optional(),
  })
  .refine((v) => !(v.expiresAt && v.expiresInDays), {
    message: "Provide either expiresAt or expiresInDays, not both",
    path: ["expiresAt"],
  });

export const JoinTokenParamsSchema = z.object({
  token: z.string().min(8).max(255),
});
