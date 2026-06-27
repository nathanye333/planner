"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  CalendarCheck,
  Heart,
  Images,
  UsersRound,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, timeAgo } from "@/lib/format";
import { useTimezone } from "@/components/timezone-provider";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/types/database.types";
import type { Enums } from "@/lib/types/database.types";

type ActivityRow = Tables<"activities"> & {
  actor: {
    id: string;
    display_name: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

const ICONS: Record<Enums<"activity_type">, typeof CalendarPlus> = {
  event_created: CalendarPlus,
  rsvp_changed: CalendarCheck,
  group_joined: UsersRound,
  photos_uploaded: Images,
};

function describe(a: ActivityRow): { text: string; href: string | null } {
  const actor = a.actor?.display_name ?? "Someone";
  const payload = (a.payload ?? {}) as Record<string, string>;
  switch (a.type) {
    case "event_created":
      return {
        text: `${actor} created an event${payload.title ? `: ${payload.title}` : ""}`,
        href: a.subject_id ? `/events/${a.subject_id}` : null,
      };
    case "rsvp_changed": {
      const verb =
        payload.status === "committed"
          ? "is going to"
          : payload.status === "tentative"
            ? "might go to"
            : "can't make";
      return {
        text: `${actor} ${verb} an event`,
        href: a.subject_id ? `/events/${a.subject_id}` : null,
      };
    }
    case "group_joined":
      return {
        text: `${actor} joined a group`,
        href: a.group_id ? `/groups/${a.group_id}` : null,
      };
    case "photos_uploaded":
      return {
        text: `${actor} added photos to an event`,
        href: a.subject_id ? `/events/${a.subject_id}` : null,
      };
    default:
      return { text: `${actor} did something`, href: null };
  }
}

export function Feed({ userId }: { userId: string }) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const timezone = useTimezone();

  const { data: activities = [] } = useQuery({
    queryKey: ["feed"],
    queryFn: async (): Promise<ActivityRow[]> => {
      const { data } = await supabase
        .from("activities")
        .select(
          "*, actor:profiles!activities_actor_id_fkey(id, display_name, username, avatar_url)",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      return (data as ActivityRow[] | null) ?? [];
    },
  });

  const activityIds = activities.map((a) => a.id);

  const { data: reactions = [] } = useQuery({
    queryKey: ["feed-reactions", activityIds.join(",")],
    enabled: activityIds.length > 0,
    queryFn: async (): Promise<Tables<"reactions">[]> => {
      const { data } = await supabase
        .from("reactions")
        .select("*")
        .eq("target_type", "activity")
        .in("target_id", activityIds);
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities" },
        () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const toggleLike = useMutation({
    mutationFn: async ({
      activityId,
      reacted,
    }: {
      activityId: string;
      reacted: boolean;
    }) => {
      if (reacted) {
        await supabase
          .from("reactions")
          .delete()
          .eq("user_id", userId)
          .eq("target_type", "activity")
          .eq("target_id", activityId)
          .eq("type", "like");
      } else {
        await supabase.from("reactions").insert({
          user_id: userId,
          target_type: "activity",
          target_id: activityId,
          type: "like",
        });
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["feed-reactions"] }),
  });

  function reactionState(activityId: string) {
    const forActivity = reactions.filter((r) => r.target_id === activityId);
    return {
      count: forActivity.length,
      reacted: forActivity.some((r) => r.user_id === userId),
    };
  }

  if (activities.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
        Your feed is quiet. Add friends and join groups to see their activity.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {activities.map((a) => {
        const { text, href } = describe(a);
        const Icon = ICONS[a.type];
        const { count, reacted } = reactionState(a.id);
        return (
          <li key={a.id}>
            <Card>
              <CardContent className="flex items-start gap-3">
                <Avatar className="size-9">
                  <AvatarImage src={a.actor?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {initials(a.actor?.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="text-muted-foreground size-4 shrink-0" />
                    {href ? (
                      <Link href={href} className="text-sm hover:underline">
                        {text}
                      </Link>
                    ) : (
                      <span className="text-sm">{text}</span>
                    )}
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {timeAgo(a.created_at, timezone)}
                  </span>
                </div>
                <button
                  onClick={() =>
                    toggleLike.mutate({ activityId: a.id, reacted })
                  }
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition",
                    reacted
                      ? "border-destructive/40 text-destructive"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  <Heart
                    className={cn("size-4", reacted && "fill-current")}
                  />
                  {count > 0 && count}
                </button>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
