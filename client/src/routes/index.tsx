import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { eventsApi, type EventItem } from "@/services/api";
import { EventCard } from "@/components/EventCard";
import { Loader } from "@/components/Loader";
import { ErrorMessage, EmptyState } from "@/components/ErrorMessage";
import { getErrorMessage } from "@/lib/errors";
import {
  Search,
  MapPin,
  Sparkles,
  TrendingUp,
  Music,
  Code,
  Utensils,
  Palette,
  Briefcase,
  Dumbbell,
  GraduationCap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const CATEGORIES = [
  { name: "All", icon: Sparkles },
  { name: "Music", icon: Music },
  { name: "Tech", icon: Code },
  { name: "Sports", icon: Dumbbell },
  { name: "Food", icon: Utensils },
  { name: "Art", icon: Palette },
  { name: "Business", icon: Briefcase },
  { name: "Workshop", icon: GraduationCap },
];

function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("");

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { category?: string; location?: string } = {};
      if (category !== "All") params.category = category;
      if (location.trim()) params.location = location.trim();
      const data = await eventsApi.list(params);
      setEvents(data);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Couldn't load events. Is the API running?"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchEvents, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, location]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Layered aura background */}
        <div className="absolute inset-0 -z-10 bg-hero-aura" />
        {/* Floating orbs */}
        <div className="absolute -left-20 top-20 -z-10 h-72 w-72 rounded-full bg-coral/30 blur-3xl animate-float-slow" />
        <div className="absolute right-0 top-40 -z-10 h-96 w-96 rounded-full bg-amber-glow/30 blur-3xl animate-float-slower" />
        <div className="absolute bottom-0 left-1/3 -z-10 h-64 w-64 rounded-full bg-violet-deep/20 blur-3xl animate-float-slow" />

        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="animate-fade-up">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium tracking-wide shadow-soft backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Live now — {events.length || "many"} experiences awaiting you
            </p>
            <h1 className="font-display text-5xl leading-[0.95] md:text-7xl lg:text-[5.5rem]">
              Find your next
              <br />
              <span className="text-gradient-warm italic">unforgettable</span> night.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
              Concerts, workshops, food festivals and meetups — discover what's happening near you,
              then book in one tap.
            </p>
          </div>

          {/* Filter bar */}
          <div className="mt-10 flex flex-col gap-3 rounded-3xl border border-border bg-card/90 p-3 shadow-soft backdrop-blur-md md:flex-row md:items-center animate-fade-up [animation-delay:120ms]">
            <div className="flex flex-1 items-center gap-3 rounded-2xl px-4 transition-colors focus-within:bg-muted/50">
              <MapPin className="h-5 w-5 text-accent" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Search city or venue…"
                className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="hidden h-8 w-px bg-border md:block" />
            <div className="flex items-center gap-3 rounded-2xl px-4">
              <Search className="h-5 w-5 text-accent" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-transparent py-3 pr-6 text-sm outline-none cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchEvents}
              className="rounded-2xl bg-gradient-cta px-7 py-3 text-sm font-semibold text-accent-foreground shadow-soft transition-all hover:shadow-lift hover:scale-[1.02] active:scale-95"
            >
              Search events
            </button>
          </div>

          {/* Stats strip */}
          <div className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-4 text-sm text-muted-foreground animate-fade-up [animation-delay:240ms]">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span>
                <strong className="text-foreground">10k+</strong> events monthly
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>
                <strong className="text-foreground">50+</strong> cities
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex -space-x-2">
                {["coral", "amber-glow", "violet-deep", "mint"].map((c) => (
                  <span
                    key={c}
                    className={`h-6 w-6 rounded-full border-2 border-background bg-${c}`}
                    style={{ background: `var(--${c})` }}
                  />
                ))}
              </span>
              <span>
                <strong className="text-foreground">25k+</strong> happy guests
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Category pills */}
      <section className="mx-auto max-w-7xl px-6 pt-12">
        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map(({ name, icon: Icon }) => {
            const active = category === name;
            return (
              <button
                key={name}
                onClick={() => setCategory(name)}
                className={`group flex shrink-0 items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "border-ink bg-ink text-cream shadow-soft scale-105"
                    : "border-border bg-card text-muted-foreground hover:border-ink/40 hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "" : "text-accent"}`} />
                {name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Events grid */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-4xl md:text-5xl">Upcoming events</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Curated for{" "}
              <span className="text-foreground font-medium">{location || "everywhere"}</span> ·{" "}
              <span className="text-foreground font-medium">{category}</span>
            </p>
          </div>
          {!loading && events.length > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
              {events.length} found
            </span>
          )}
        </div>

        {loading && <Loader label="Finding events…" />}
        {error && !loading && <ErrorMessage message={error} onRetry={fetchEvents} />}
        {!loading && !error && events.length === 0 && (
          <EmptyState
            title="No events found"
            message="Try adjusting your filters or check back soon."
          />
        )}
        {!loading && !error && events.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {events.map((e, i) => (
              <div
                key={e._id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 60, 600)}ms` }}
              >
                <EventCard event={e} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA Banner */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-violet-deep to-ink p-10 md:p-16 grain">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-coral/40 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-amber-glow/30 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-xl">
              <h3 className="font-display text-3xl text-cream md:text-5xl">
                Got something <em className="text-gradient-warm not-italic">brilliant</em> to host?
              </h3>
              <p className="mt-3 text-cream/70">
                Publish your event in 60 seconds. Free for the first 100 attendees.
              </p>
            </div>
            <a
              href="/create"
              className="rounded-2xl bg-cream px-7 py-3.5 text-sm font-semibold text-ink shadow-glow transition hover:scale-105"
            >
              Host an event →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
