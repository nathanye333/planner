import { z } from "zod";

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    location: z.string().trim().max(200).optional().or(z.literal("")),
    start_at: z.string().min(1, "Start time is required"),
    end_at: z.string().min(1, "End time is required"),
    visibility: z.enum(["private", "friends", "group", "public"]),
    group_id: z.string().uuid().optional().or(z.literal("")),
    invitee_ids: z.array(z.string().uuid()).optional(),
    is_proposal: z.boolean().optional(),
    lock_mode: z.enum(["threshold", "manual"]).optional(),
    threshold_count: z.number().int().min(2).optional(),
    voting_deadline: z.string().optional().or(z.literal("")),
  })
  .refine((v) => new Date(v.end_at) >= new Date(v.start_at), {
    message: "End must be after start",
    path: ["end_at"],
  })
  .refine((v) => v.visibility !== "group" || !!v.group_id, {
    message: "Pick a group for group visibility",
    path: ["group_id"],
  })
  .refine(
    (v) =>
      !v.is_proposal ||
      !v.lock_mode ||
      v.lock_mode !== "threshold" ||
      (v.threshold_count !== undefined && v.threshold_count >= 2),
    {
      message: "Threshold must be at least 2",
      path: ["threshold_count"],
    },
  );

export type EventInput = z.infer<typeof eventSchema>;
