"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { NotificationRow } from "./describe";

export function NotificationsBell({ userId }: { userId: string }) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const timezone = useTimezone();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data } = await supabase
        .from("notifications")
        .select(
          "*, actor:profiles!notifications_actor_id_fkey(display_name, username, avatar_url)",
        )
        .order("created_at", { ascending: false })
        .limit(30);
      return (data as NotificationRow[] | null) ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const unread = notifications.filter((n) => !n.read_at).length;

  // userId kept as prop for future use (e.g. scoped realtime channels)
  void userId;

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link href="/notifications">
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="bg-destructive absolute top-1 right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-medium text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}
