import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { eventsApi, bookingsApi, type EventItem } from "@/services/api";
import { Loader } from "@/components/Loader";
import { ErrorMessage } from "@/components/ErrorMessage";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/errors";
import toast from "react-hot-toast";
import { CalendarDays, MapPin, Tag, ArrowLeft, Pencil } from "lucide-react";

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetailsPage,
});

function EventDetailsPage() {
  const { eventId } = useParams({ from: "/events/$eventId" });
  const { isAuthenticated, user } = useAuth();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otp, setOtp] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setEvent(await eventsApi.get(eventId));
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Event not found."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [eventId]);

  const handleSendOtp = async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to request a booking OTP");
      return;
    }
    setSendingOtp(true);
    try {
      const response = await bookingsApi.sendOtp();
      if (response.otp) {
        setOtp(response.otp);
      }
      toast.success(response.message || "OTP sent to your email.");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Couldn't send OTP"));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleBook = async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to book this event");
      return;
    }
    if (otp.trim().length < 6) {
      toast.error("Enter the OTP sent to your email");
      return;
    }
    setBooking(true);
    try {
      await bookingsApi.create(eventId, otp.trim());
      setOtp("");
      toast.success("Booking request submitted. It will appear in My Bookings.");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Couldn't book event"));
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <Loader />;
  if (error || !event)
    return (
      <div className="py-16">
        <ErrorMessage message={error || "Not found"} onRetry={load} />
      </div>
    );

  const date = new Date(event.date);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to discover
      </Link>
      {user?.role === "admin" && (
        <Link
          to="/edit-event/$eventId"
          params={{ eventId }}
          className="ml-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <Pencil className="h-4 w-4" /> Edit event
        </Link>
      )}

      <div className="mt-6 overflow-hidden rounded-3xl border border-border">
        <div className="relative h-64 md:h-80 bg-gradient-to-br from-coral to-amber-glow">
          {event.imageUrl && (
            <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
          )}
          <span className="absolute left-6 top-6 rounded-full bg-card/95 px-4 py-1.5 text-xs font-semibold backdrop-blur">
            {event.category}
          </span>
        </div>

        <div className="grid gap-8 p-6 md:p-10 md:grid-cols-3">
          <div className="md:col-span-2">
            <h1 className="font-display text-4xl md:text-5xl leading-tight">{event.title}</h1>
            <div className="mt-6 flex flex-wrap gap-5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-accent" />
                {date.toLocaleDateString("en", { dateStyle: "full" })}
                {event.time ? ` · ${event.time}` : ""}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                {event.location}
              </span>
              <span className="inline-flex items-center gap-2">
                <Tag className="h-4 w-4 text-accent" />
                {event.category}
              </span>
            </div>
            <p className="mt-8 text-base leading-relaxed text-foreground/80">
              {event.description ||
                "Join us for an unforgettable experience. More details coming from the host soon."}
            </p>
          </div>

          <aside className="rounded-2xl border border-border bg-secondary/40 p-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Ticket</p>
            <p className="mt-1 font-display text-3xl">
              {event.price ? `Rs ${event.price}` : "Free"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {event.availableSeats} of {event.totalSeats} seats available
            </p>
            <div className="mt-5 rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
              Booking request admin approval ke baad confirm hogi. Payment flow abhi disabled hai.
            </div>
            <button
              onClick={handleSendOtp}
              disabled={sendingOtp}
              className="mt-5 w-full rounded-xl border border-accent px-6 py-3 text-sm font-semibold text-accent hover:bg-accent/10 disabled:opacity-50"
            >
              {sendingOtp ? "Sending OTP…" : "Send booking OTP"}
            </button>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter booking OTP"
              className="mt-3 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <button
              onClick={handleBook}
              disabled={booking}
              className="mt-5 w-full rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {booking ? "Processing…" : "Book event"}
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              Bookings require OTP verification and admin approval.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
