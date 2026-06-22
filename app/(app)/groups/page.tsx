import Link from "next/link";
import { Users } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";

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

  const { data } = await supabase
    .from("group_members")
    .select("role, group:groups(id, name, description)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const groups = (data ?? []) as GroupRow[];

  return (
    <div>
      <PageHeader
        title="Groups"
        description="Shared calendars for the people you plan with."
        action={<CreateGroupDialog />}
      />

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
