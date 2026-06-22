import Link from "next/link";
import { CalendarHeart, Eye, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

const features = [
  {
    icon: Eye,
    title: "Privacy-first availability",
    body: "Sync your calendar and share only Free / Tentative / Busy — never your private event titles.",
  },
  {
    icon: Sparkles,
    title: "When2Meet planner",
    body: "Pick participants and a date range, then let the heatmap rank the best times automatically.",
  },
  {
    icon: Users,
    title: "Groups & shared calendars",
    body: "Roommates, clubs, project teams — overlay everyone's availability on one calendar.",
  },
  {
    icon: CalendarHeart,
    title: "Events & memories",
    body: "RSVP, discuss, and share photos after the event in a Partiful-style social feed.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-xl font-bold tracking-tight">{APP_NAME}</span>
        <Button asChild variant="ghost">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6">
        <section className="flex flex-col items-center gap-6 py-20 text-center md:py-28">
          <span className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs font-medium">
            When2Meet × TimeTree × Partiful
          </span>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance md:text-6xl">
            Plan together, without giving up your privacy.
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg text-pretty">
            {APP_NAME} turns your busy calendar into simple availability so
            friends and groups can find the perfect time to meet — fast.
          </p>
          <div className="flex gap-3">
            <Button asChild size="lg">
              <Link href="/login">Get started — it&apos;s free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#features">See how it works</Link>
            </Button>
          </div>
        </section>

        <section
          id="features"
          className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card flex flex-col gap-3 rounded-xl border p-6"
            >
              <f.icon className="text-primary size-6" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="text-muted-foreground mx-auto w-full max-w-6xl px-6 py-8 text-sm">
        Built on Next.js, Supabase, and Vercel.
      </footer>
    </div>
  );
}
