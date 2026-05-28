import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { EventForm } from "@/components/EventForm";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Loader } from "@/components/Loader";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/errors";
import { eventsApi, type EventItem } from "@/services/api";

export const Route = createFileRoute("/edit-event/$eventId")({
  component: () => (
    <ProtectedRoute>
      <EditEventPage />
    </ProtectedRoute>
  ),
});

function EditEventPage() {
  const { user } = useAuth();
  const { eventId } = useParams({ from: "/edit-event/$eventId" });
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        setEvent(await eventsApi.get(eventId));
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Couldn't load event"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  if (user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
          <h1 className="font-display text-4xl">Admin access only</h1>
          <p className="mt-3 text-muted-foreground">
            Only admin accounts can edit published events.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <Loader label="Loading event…" />;
  if (error || !event)
    return (
      <div className="py-16">
        <ErrorMessage message={error || "Event not found"} />
      </div>
    );

  const handleSubmit = async (form: {
    title: string;
    date: string;
    time: string;
    location: string;
    category: string;
    description: string;
    price: string;
    totalSeats: string;
    imageUrl: string;
  }) => {
    try {
      const seats = Number(form.totalSeats);
      const alreadyBooked = Math.max(event.totalSeats - event.availableSeats, 0);
      const nextAvailableSeats = Math.max(seats - alreadyBooked, 0);

      const updated = await eventsApi.update(eventId, {
        title: form.title.trim(),
        date: form.date,
        time: form.time.trim(),
        location: form.location.trim(),
        category: form.category,
        description: form.description.trim(),
        price: form.price ? Number(form.price) : 0,
        totalSeats: seats,
        availableSeats: nextAvailableSeats,
        imageUrl: form.imageUrl.trim(),
      });
      toast.success("Event updated!");
      navigate({ to: "/events/$eventId", params: { eventId: updated._id } });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Couldn't update event"));
      throw err;
    }
  };

  return (
    <EventForm
      heading="Edit event"
      description="Update the details for your published event."
      submitLabel="Save changes"
      submittingLabel="Saving…"
      initialValues={{
        title: event.title,
        date: event.date?.slice(0, 10) || "",
        time: event.time || "",
        location: event.location,
        category: event.category,
        description: event.description,
        price: String(event.price ?? 0),
        totalSeats: String(event.totalSeats),
        imageUrl: event.imageUrl,
      }}
      onSubmit={handleSubmit}
    />
  );
}
