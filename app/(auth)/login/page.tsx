import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleSignInButton } from "./google-sign-in-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/calendar");

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            {APP_NAME}
          </Link>
          <CardTitle className="pt-2 text-lg font-medium">
            Welcome back
          </CardTitle>
          <CardDescription>
            Sign in with Google to sync your calendar and start planning.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <GoogleSignInButton next={next} />
          <p className="text-muted-foreground text-center text-xs text-balance">
            We only read your availability — never your private event details.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
