import { Link } from "@tanstack/react-router";
import type { EventItem } from "@/services/api";
import { CalendarDays, MapPin, ArrowUpRight } from "lucide-react";

const gradients = [
  "from-[oklch(0.7_0.22_25)] via-[oklch(0.78_0.18_45)] to-[oklch(0.85_0.17_75)]",
  "from-[oklch(0.45_0.22_295)] via-[oklch(0.6_0.22_320)] to-[oklch(0.72_0.2_15)]",
  "from-[oklch(0.55_0.18_200)] via-[oklch(0.68_0.15_180)] to-[oklch(0.82_0.14_140)]",
  "from-[oklch(0.5_0.22_320)] via-[oklch(0.62_0.22_350)] to-[oklch(0.78_0.18_30)]",
  "from-[oklch(0.4_0.18_260)] via-[oklch(0.55_0.2_290)] to-[oklch(0.7_0.2_330)]",
  "from-[oklch(0.65_0.18_140)] via-[oklch(0.75_0.16_100)] to-[oklch(0.85_0.17_75)]",
];

function pickGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return gradients[h % gradients.length];
}

export function EventCard({ event }: { event: EventItem }) {
  const date = new Date(event.date);
  const day = date.getDate();
  const month = date.toLocaleString("en", { month: "short" }).toUpperCase();
  const priceLabel = event.price ? `Rs ${event.price}` : "Free";

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event._id }}
      className="card-lift card-lift-hover group relative block overflow-hidden rounded-3xl border border-border bg-card"
    >
      {/* Image / gradient hero */}
      <div
        className={`relative h-52 overflow-hidden bg-gradient-to-br ${pickGradient(event._id || event.title)}`}
      >
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        )}
        {/* Decorative blobs */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-black/20 blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Date chip */}
        <div className="absolute left-4 top-4 rounded-2xl bg-card/95 px-3 py-2 text-center shadow-soft backdrop-blur">
          <div className="text-[10px] font-bold tracking-[0.15em] text-accent">{month}</div>
          <div className="font-display text-2xl leading-none">{day}</div>
        </div>
        <span className="absolute right-4 top-4 rounded-full bg-ink/85 px-3 py-1 text-xs font-medium text-cream backdrop-blur-md">
          {event.category}
        </span>

        {/* Hover arrow */}
        <div className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-card/95 opacity-0 shadow-soft backdrop-blur transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2">
          <ArrowUpRight className="h-5 w-5 text-ink" />
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-display text-xl leading-tight transition-colors group-hover:text-accent">
          {event.title}
        </h3>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-accent/70" />
            <span className="truncate">{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0 text-accent/70" />
            <span>
              {date.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "long" })}{" "}
              {event.time ? `· ${event.time}` : ""}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">
            {event.availableSeats} / {event.totalSeats} seats left
          </span>
          <span className="font-display text-lg">{priceLabel}</span>
        </div>
      </div>
    </Link>
  );
}
