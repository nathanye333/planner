import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth redirect target. Exchanges the auth code for a session, persists the
 * Google provider tokens (for calendar sync), then routes the user to
 * onboarding or their requested destination.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // If Google returned calendar tokens, store them for periodic sync.
  // Only overwrite refresh_token when Google actually returned one — re-auths
  // often omit it, and writing null would break future syncs.
  const { provider_token, provider_refresh_token } = data.session;
  if (provider_token || provider_refresh_token) {
    const upsertData: Record<string, unknown> = {
      user_id: data.session.user.id,
      provider: "google",
      access_token: provider_token ?? null,
    };
    if (provider_refresh_token) {
      upsertData.refresh_token = provider_refresh_token;
    }
    await supabase.from("calendar_connections").upsert(upsertData, {
      onConflict: "user_id,provider",
    });
  }

  // Send brand-new users to onboarding.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", data.session.user.id)
    .single();

  const destination = profile?.onboarded ? next : "/onboarding";
  return NextResponse.redirect(`${origin}${destination}`);
}
