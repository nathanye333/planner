"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { describeNotification, type NotificationRow } from "./describe";

export function NotificationsList({ userId }: { userId: string }) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data } = await supabase
        .from("notifications")
        .select(
          "*, actor:profiles!notifications_actor_id_fkey(display_name, username, avatar_url)",
        )
        .order("created_at", { ascending: false })
        .limit(60);
      return (data as NotificationRow[] | null) ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("notifications-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .subscribe();

    // Mark all as read when the page is viewed
    void supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .eq("user_id", userId);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, userId]);

  if (notifications.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
        You&apos;re all caught up.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {notifications.map((n) => {
        const { text, href } = describeNotification(n);
        const body = (
          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3",
              !n.read_at && "bg-accent/40",
            )}
          >
            <Avatar className="size-9 shrink-0">
              <AvatarImage src={n.actor?.avatar_url ?? undefined} />
              <AvatarFallback>{initials(n.actor?.display_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-sm">
              <p>{text}</p>
              <span className="text-muted-foreground text-xs">
                {timeAgo(n.created_at)}
              </span>
            </div>
            {!n.read_at && (
              <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
            )}
          </div>
        );
        return (
          <li key={n.id}>
            {href ? <Link href={href}>{body}</Link> : body}
          </li>
        );
      })}
    </ul>
  );
}
