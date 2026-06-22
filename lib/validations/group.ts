import { z } from "zod";

export const groupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Name too long"),
  description: z
    .string()
    .trim()
    .max(280, "Description too long")
    .optional()
    .or(z.literal("")),
});

export type GroupInput = z.infer<typeof groupSchema>;
