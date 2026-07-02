"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTimezone } from "@/components/timezone-provider";
import { describeNotification, type NotificationRow } from "./describe";

export function NotificationsBell({ userId }: { userId: string }) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const timezone = useTimezone();
  const [open, setOpen] = useState(false);
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
  const preview = notifications.slice(0, 5);

  // userId kept as prop for future use (e.g. scoped realtime channels)
  void userId;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="bg-destructive absolute top-1 right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-medium text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-medium">Notifications</span>
        </div>
        {preview.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">
            You&apos;re all caught up.
          </p>
        ) : (
          <ul className="flex flex-col p-2">
            {preview.map((n) => {
              const { text, href } = describeNotification(n);
              const body = (
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-md p-2",
                    !n.read_at && "bg-accent/40",
                  )}
                >
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={n.actor?.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {initials(n.actor?.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-sm">
                    <p>{text}</p>
                    <span className="text-muted-foreground text-xs">
                      {timeAgo(n.created_at, timezone)}
                    </span>
                  </div>
                </div>
              );
              return (
                <li key={n.id}>
                  {href ? (
                    <Link href={href} onClick={() => setOpen(false)}>
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="border-t p-2">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="hover:bg-accent block rounded-md p-2 text-center text-sm font-medium"
          >
            View all
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
