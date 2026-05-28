import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { bookingsApi, type Booking } from "@/services/api";
import { Loader } from "@/components/Loader";
import { ErrorMessage, EmptyState } from "@/components/ErrorMessage";
import { getErrorMessage } from "@/lib/errors";
import { CalendarDays, MapPin, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/my-bookings")({
  component: () => (
    <ProtectedRoute>
      <MyBookingsPage />
    </ProtectedRoute>
  ),
});

function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setBookings(await bookingsApi.mine());
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Couldn't load bookings"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = async (id: string) => {
    if (!confirm("Cancel this booking?")) return;
    try {
      await bookingsApi.remove(id);
      setBookings((b) => b.filter((x) => x._id !== id));
      toast.success("Booking cancelled");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Couldn't cancel"));
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-4xl">My bookings</h1>
      <p className="mt-2 text-muted-foreground">Everything you've signed up for, in one place.</p>

      <div className="mt-8">
        {loading && <Loader />}
        {error && !loading && <ErrorMessage message={error} onRetry={load} />}
        {!loading && !error && bookings.length === 0 && (
          <EmptyState
            title="No bookings yet"
            message="Once you book your first event, it'll show up here."
            action={
              <Link
                to="/"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
              >
                Discover events
              </Link>
            }
          />
        )}
        {!loading && !error && bookings.length > 0 && (
          <div className="space-y-4">
            {bookings.map((b) => {
              const ev = b.eventId;
              const date = new Date(ev?.date || b.createdAt);
              return (
                <div
                  key={b._id}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:flex-row sm:items-center"
                >
                  <div className="flex h-16 w-16 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-coral to-amber-glow text-cream">
                    <span className="text-[10px] font-semibold tracking-wider">
                      {date.toLocaleString("en", { month: "short" }).toUpperCase()}
                    </span>
                    <span className="font-display text-2xl leading-none">{date.getDate()}</span>
                  </div>
                  <div className="flex-1">
                    <Link
                      to="/events/$eventId"
                      params={{ eventId: ev?._id || "" }}
                      className="font-display text-xl hover:text-accent"
                    >
                      {ev?.title || "Event"}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {ev?.location}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {date.toLocaleDateString()} {ev?.time ? `· ${ev.time}` : ""}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        {b.status} · {b.paymentStatus === "paid" ? "paid" : "payment pending"}
                      </span>
                      {b.paymentMethod && b.paymentMethod !== "none" && (
                        <span className="inline-flex items-center gap-1.5">
                          {b.paymentMethod} · {b.paymentReference || "reference saved"}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => cancel(b._id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" /> Cancel
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
