import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { HeroGrid } from "@/components/marketing/hero-grid";
import { MockPlanner } from "@/components/marketing/mock-planner";
import { MockHeatmap } from "@/components/marketing/mock-heatmap";
import { MockProposal } from "@/components/marketing/mock-proposal";
import "./marketing.css";

const STEPS = [
  {
    eyebrow: "Mark your time",
    title: "Free, tentative, or busy — that's it",
    body: "No one sees your event titles or locations. You paint blocks on your own calendar, and pick which groups get to see each one.",
    mock: <MockPlanner />,
  },
  {
    eyebrow: "See the overlap",
    title: "The grid tells you when to ask",
    body: "Everyone's blocks stack into one heatmap. Darker green means more people are free — the best time to meet is obvious at a glance.",
    mock: <MockHeatmap />,
  },
  {
    eyebrow: "Lock it in",
    title: "Propose a time, let the group vote",
    body: "Send a time slot, people tap yes / maybe / no, and the event confirms itself once enough people are in. No follow-up text required.",
    mock: <MockProposal />,
  },
];

const USE_CASES = [
  "Roommates splitting chores and rent-day check-ins",
  "Friend groups trying to lock down a trip",
  "Study groups finding a weekly slot that sticks",
  "Small teams and clubs planning around everyone's schedule",
];

export default function LandingPage() {
  return (
    <div className="marketing">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-medium tracking-tight">
          {APP_NAME}
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <section className="band-ink">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 px-6 pt-10 pb-20 text-center md:pt-16">
          <div className="flex max-w-2xl flex-col items-center gap-5">
            <span className="dim text-xs font-medium tracking-[0.14em] uppercase">
              Group scheduling
            </span>
            <h1 className="font-display text-4xl leading-[1.05] font-medium tracking-tight text-balance md:text-6xl">
              See who&apos;s free, before you ask.
            </h1>
            <p className="dim max-w-md text-base text-pretty md:text-lg">
              {APP_NAME}{" "}overlays everyone&apos;s calendar into one grid, so
              you can spot a time that works instead of guessing.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login">Get started — it&apos;s free</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[#3a3f48] bg-transparent text-[#f3f1ea] hover:bg-[#1c2028] hover:text-[#f3f1ea]"
            >
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>

          <div className="w-full max-w-md">
            <HeroGrid />
            <p className="dim mt-4 text-xs">
              Sat, 4:00pm — everyone in the group is free
            </p>
          </div>
        </div>
      </section>

      <main id="how-it-works" className="mx-auto w-full max-w-6xl px-6">
        <div className="flex flex-col gap-20 py-20 md:gap-28 md:py-28">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className={`flex flex-col items-center gap-10 md:flex-row md:gap-16 ${
                i % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              <div className="flex flex-1 flex-col items-start gap-3 text-left">
                <span className="dim text-xs font-medium tracking-[0.14em] uppercase">
                  {step.eyebrow}
                </span>
                <h2 className="font-display text-2xl leading-tight font-medium tracking-tight text-balance md:text-3xl">
                  {step.title}
                </h2>
                <p className="dim max-w-sm text-base text-pretty">
                  {step.body}
                </p>
              </div>
              <div className="flex flex-1 justify-center">{step.mock}</div>
            </div>
          ))}
        </div>
      </main>

      <section className="band-paper border-t" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
          <h2 className="font-display mb-8 max-w-md text-2xl leading-tight font-medium tracking-tight text-balance md:text-3xl">
            Works for any group that needs to be in the same place at once.
          </h2>
          <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {USE_CASES.map((u) => (
              <li
                key={u}
                className="dim border-t py-3 text-base"
                style={{ borderColor: "var(--line)" }}
              >
                {u}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="band-ink">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-20 text-center md:py-24">
          <h2 className="font-display max-w-lg text-3xl leading-tight font-medium tracking-tight text-balance md:text-4xl">
            Stop asking &quot;does Thursday work?&quot;
          </h2>
          <Button asChild size="lg">
            <Link href="/login">Get started — it&apos;s free</Link>
          </Button>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 py-8 text-sm" style={{ color: "var(--paper-text-dim)" }}>
        Built on Next.js, Supabase, and Vercel.
      </footer>
    </div>
  );
}
