import { z } from "zod";

export const plannerSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120),
    date_start: z.string().min(1, "Start date is required"),
    date_end: z.string().min(1, "End date is required"),
    day_start_hour: z.coerce.number().int().min(0).max(23),
    day_end_hour: z.coerce.number().int().min(1).max(24),
    slot_minutes: z.coerce.number().int().refine((n) => [15, 30, 60].includes(n), {
      message: "Slot must be 15, 30, or 60 minutes",
    }),
    group_id: z.string().uuid().optional().or(z.literal("")),
    participant_ids: z.array(z.string().uuid()).optional(),
  })
  .refine((v) => new Date(v.date_end) >= new Date(v.date_start), {
    message: "End date must be after start date",
    path: ["date_end"],
  })
  .refine((v) => v.day_end_hour > v.day_start_hour, {
    message: "Day end must be after day start",
    path: ["day_end_hour"],
  });

export type PlannerInput = z.infer<typeof plannerSchema>;
