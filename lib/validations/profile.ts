import { z } from "zod";
import { TIMEZONES } from "@/lib/constants";

export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(60, "Name is too long"),
  username: z
    .string()
    .trim()
    .min(3, "At least 3 characters")
    .max(24, "At most 24 characters")
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers and underscores only"),
  timezone: z.enum(TIMEZONES),
  bio: z.string().trim().max(200, "Bio is too long").optional().or(z.literal("")),
  avatar_url: z.string().url().optional().or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;
