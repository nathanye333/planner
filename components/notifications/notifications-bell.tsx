"use client";

import { useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { describeNotification, type NotificationRow } from "./describe";

export function NotificationsBell({ userId }: { userId: string }) {
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

  async function markAllRead() {
    if (unread === 0) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .eq("user_id", userId);
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <Popover>
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
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              onClick={() => void markAllRead()}
              className="text-muted-foreground text-xs hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-sm">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const { text, href } = describeNotification(n);
                const body = (
                  <div
                    className={cn(
                      "flex items-start gap-3 px-4 py-3",
                      !n.read_at && "bg-accent/40",
                    )}
                  >
                    <Avatar className="size-8">
                      <AvatarImage src={n.actor?.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {initials(n.actor?.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-sm">
                      <p>{text}</p>
                      <span className="text-muted-foreground text-xs">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {href ? <Link href={href}>{body}</Link> : body}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
