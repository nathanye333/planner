import { z } from "zod";

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    location: z.string().trim().max(200).optional().or(z.literal("")),
    cover_url: z.string().url().optional().or(z.literal("")),
    start_at: z.string().min(1, "Start time is required"),
    end_at: z.string().min(1, "End time is required"),
    visibility: z.enum(["private", "friends", "group", "public"]),
    group_id: z.string().uuid().optional().or(z.literal("")),
    invitee_ids: z.array(z.string().uuid()).optional(),
  })
  .refine((v) => new Date(v.end_at) >= new Date(v.start_at), {
    message: "End must be after start",
    path: ["end_at"],
  })
  .refine((v) => v.visibility !== "group" || !!v.group_id, {
    message: "Pick a group for group visibility",
    path: ["group_id"],
  });

export type EventInput = z.infer<typeof eventSchema>;
