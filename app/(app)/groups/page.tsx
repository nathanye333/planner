import Link from "next/link";
import { Users } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";
import { AvailabilityEditor } from "@/components/calendar/availability-editor";
import type { GroupShare } from "@/components/calendar/availability-editor";

type GroupRow = {
  role: string;
  group: {
    id: string;
    name: string;
    description: string | null;
  } | null;
};

export default async function GroupsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data }, { count: pendingRequests }] = await Promise.all([
    supabase
      .from("group_members")
      .select("role, group:groups(id, name, description)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("friend_requests")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", profile.id)
      .eq("status", "pending"),
  ]);

  const groups = (data ?? []) as GroupRow[];

  const groupList: GroupShare[] = groups
    .filter((r) => r.group !== null)
    .map(({ group }) => ({ id: group!.id, name: group!.name }));

  return (
    <div>
      <PageHeader
        title="Home"
        description="Your calendar and groups, all in one place."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">My Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityEditor userId={profile.id} groups={groupList} />
        </CardContent>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Groups</h2>
        <CreateGroupDialog />
      </div>

      {(pendingRequests ?? 0) > 0 && (
        <Link href="/friends">
          <div className="bg-accent/60 text-accent-foreground mb-5 flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm hover:bg-accent">
            <span>
              You have <strong>{pendingRequests}</strong> pending friend{" "}
              {pendingRequests === 1 ? "request" : "requests"}
            </span>
            <span className="text-muted-foreground text-xs">View →</span>
          </div>
        </Link>
      )}

      {groups.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
          You&apos;re not in any groups yet. Create one to get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map(({ group, role }) =>
            group ? (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="h-full transition-colors hover:border-foreground/20">
                  <CardContent className="flex items-start gap-3">
                    <div className="bg-secondary flex size-10 shrink-0 items-center justify-center rounded-md">
                      <Users className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{group.name}</p>
                        {role === "admin" && (
                          <Badge variant="secondary">Admin</Badge>
                        )}
                      </div>
                      {group.description && (
                        <p className="text-muted-foreground line-clamp-2 text-sm">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
