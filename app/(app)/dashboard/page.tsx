import Link from "next/link";
import {
  CalendarRange,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventListItem } from "@/components/events/event-list-item";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const nowIso = new Date().toISOString();

  const [{ count: friendCount }, { count: pendingCount }, { count: groupCount }, { data: upcoming }] =
    await Promise.all([
      supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id),
      supabase
        .from("friend_requests")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", profile.id)
        .eq("status", "pending"),
      supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id),
      supabase
        .from("events")
        .select("*")
        .gte("start_at", nowIso)
        .order("start_at", { ascending: true })
        .limit(5),
    ]);

  const stats = [
    { label: "Friends", value: friendCount ?? 0, href: "/friends", icon: UserRound },
    { label: "Pending requests", value: pendingCount ?? 0, href: "/friends", icon: UserRound },
    { label: "Groups", value: groupCount ?? 0, href: "/groups", icon: Users },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${profile.display_name.split(" ")[0] || "there"}`}
        description="Here's what's coming up."
        action={
          <Button asChild>
            <Link href="/planners/new">
              <Sparkles className="size-4" />
              Plan a time
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:border-foreground/20">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
                <s.icon className="text-muted-foreground size-7" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="size-4" />
            Upcoming events
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/events">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {upcoming && upcoming.length > 0 ? (
            upcoming.map((event) => (
              <EventListItem
                key={event.id}
                event={event}
                timezone={profile.timezone}
              />
            ))
          ) : (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No upcoming events.{" "}
              <Link href="/events/new" className="underline">
                Create one
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
