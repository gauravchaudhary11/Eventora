import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { eventsApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/errors";
import toast from "react-hot-toast";
import { EventForm } from "@/components/EventForm";

export const Route = createFileRoute("/create")({
  component: () => (
    <ProtectedRoute>
      <CreateEventPage />
    </ProtectedRoute>
  ),
});

function CreateEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
          <h1 className="font-display text-4xl">Admin access only</h1>
          <p className="mt-3 text-muted-foreground">
            Event creation on this backend is protected for admin accounts. Log in with an admin
            user to publish events.
          </p>
        </div>
      </div>
    );
  }

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
      const created = await eventsApi.create({
        title: form.title.trim(),
        date: form.date,
        time: form.time.trim(),
        location: form.location.trim(),
        category: form.category,
        description: form.description.trim(),
        price: form.price ? Number(form.price) : 0,
        totalSeats: Number(form.totalSeats),
        availableSeats: Number(form.totalSeats),
        imageUrl: form.imageUrl.trim(),
      });
      toast.success("Event created!");
      navigate({ to: "/events/$eventId", params: { eventId: created._id } });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Couldn't create event"));
      throw err;
    }
  };

  return (
    <EventForm
      heading="Host an event"
      description="Tell the world what you're putting together."
      submitLabel="Publish event"
      submittingLabel="Publishing…"
      initialValues={{
        title: "",
        date: "",
        time: "",
        location: "",
        category: "Music",
        description: "",
        price: "",
        totalSeats: "",
        imageUrl: "",
      }}
      onSubmit={handleSubmit}
    />
  );
}
