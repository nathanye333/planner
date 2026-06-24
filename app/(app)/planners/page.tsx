import Link from "next/link";
import { Sparkles } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCalendarDate } from "@/lib/timezone";
import type { Tables } from "@/lib/types/database.types";

export default async function PlannersPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("planner_participants")
    .select("planner:availability_planners(*)")
    .eq("user_id", profile.id);

  const planners = (data ?? [])
    .map((p) => p.planner as Tables<"availability_planners"> | null)
    .filter((p): p is Tables<"availability_planners"> => !!p)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  return (
    <div>
      <PageHeader
        title="Planners"
        description="When2Meet-style polls that read everyone's availability automatically."
        action={
          <Button asChild>
            <Link href="/planners/new">
              <Sparkles className="size-4" />
              New planner
            </Link>
          </Button>
        }
      />

      {planners.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
          No planners yet. Create one to find the best time to meet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {planners.map((p) => (
            <Link key={p.id} href={`/planners/${p.id}`}>
              <Card className="h-full transition-colors hover:border-foreground/20">
                <CardContent className="flex items-start gap-3">
                  <div className="bg-secondary flex size-10 shrink-0 items-center justify-center rounded-md">
                    <Sparkles className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {formatCalendarDate(p.date_start, profile.timezone)} –{" "}
                      {formatCalendarDate(p.date_end, profile.timezone)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
