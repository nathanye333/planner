"use client";

import { useState } from "react";
import { CalendarCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { useTimezone } from "@/components/timezone-provider";

const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

export function CalendarConnectionCard({
  connected,
  lastSyncedAt,
  hasRefreshToken,
}: {
  connected: boolean;
  lastSyncedAt: string | null;
  hasRefreshToken: boolean;
}) {
  const [syncing, setSyncing] = useState(false);
  const timezone = useTimezone();

  async function connect() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: GOOGLE_CALENDAR_SCOPE,
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) toast.error(error.message);
  }

  async function syncNow() {
    setSyncing(true);
    const res = await fetch("/api/sync/google", { method: "POST" });
    setSyncing(false);
    if (res.ok) {
      const json = (await res.json()) as { synced?: number; message?: string };
      toast.success(
        json.message ?? `Synced ${json.synced ?? 0} availability blocks`,
      );
    } else {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(json.error ?? "Sync failed. Check your Google connection.");
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarCheck className="size-4" />
          Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          Gather reads only your busy/free times — never event titles. Synced
          events appear as <strong>Busy</strong>; you can override any block to
          Tentative or Free.
        </p>
        {connected && hasRefreshToken ? (
          <p className="text-sm">
            Connected.{" "}
            {lastSyncedAt
              ? `Last synced ${formatDateTime(lastSyncedAt, timezone)}.`
              : "Not synced yet."}
          </p>
        ) : (
          <p className="text-sm">
            {connected
              ? "Connected, but no offline access. Reconnect to enable background sync."
              : "Not connected."}
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void connect()}>
            {connected ? "Reconnect" : "Connect Google Calendar"}
          </Button>
          {connected && (
            <Button
              variant="secondary"
              onClick={() => void syncNow()}
              disabled={syncing}
            >
              <RefreshCw className={syncing ? "size-4 animate-spin" : "size-4"} />
              Sync now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
