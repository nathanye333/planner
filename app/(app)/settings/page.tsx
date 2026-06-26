import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarConnectionCard } from "@/components/calendar/calendar-connection-card";
import { AutoShareToggle } from "@/components/availability/auto-share-toggle";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("provider, last_synced_at, sync_enabled, refresh_token")
    .eq("user_id", profile.id)
    .eq("provider", "google")
    .maybeSingle();

  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile and calendar." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm profile={profile} />
        </CardContent>
      </Card>

      <CalendarConnectionCard
        connected={!!connection}
        lastSyncedAt={connection?.last_synced_at ?? null}
        hasRefreshToken={!!connection?.refresh_token}
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Availability Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <AutoShareToggle enabled={profile.auto_share_availability ?? false} />
        </CardContent>
      </Card>
    </div>
  );
}
