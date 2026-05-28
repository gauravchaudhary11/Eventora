import { useState } from "react";

const CATEGORIES = ["Music", "Tech", "Sports", "Food", "Art", "Business", "Workshop"];

export interface EventFormValues {
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  description: string;
  price: string;
  totalSeats: string;
  imageUrl: string;
}

interface EventFormProps {
  heading: string;
  description: string;
  submitLabel: string;
  submittingLabel: string;
  initialValues: EventFormValues;
  onSubmit: (values: EventFormValues) => Promise<void>;
}

export function EventForm({
  heading,
  description,
  submitLabel,
  submittingLabel,
  initialValues,
  onSubmit,
}: EventFormProps) {
  const [form, setForm] = useState<EventFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title required";
    if (!form.date) e.date = "Date required";
    else if (new Date(form.date) < new Date(new Date().toDateString()))
      e.date = "Date must be today or later";
    if (!form.time.trim()) e.time = "Time required";
    if (!form.location.trim()) e.location = "Location required";
    if (!form.description.trim()) e.description = "Description required";
    if (!form.totalSeats || Number(form.totalSeats) <= 0)
      e.totalSeats = "Seats must be greater than 0";
    if (!form.imageUrl.trim()) e.imageUrl = "Image URL required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  const field = (
    name: keyof EventFormValues,
    label: string,
    type = "text",
    extra: Record<string, unknown> = {},
  ) => (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        {...extra}
      />
      {errors[name] && <p className="mt-1 text-xs text-destructive">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-4xl">{heading}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft"
      >
        {field("title", "Event title")}
        <div className="grid gap-5 sm:grid-cols-2">
          {field("date", "Date", "date")}
          {field("time", "Time", "text", { placeholder: "7:30 PM" })}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {field("location", "Location")}
          {field("totalSeats", "Total seats", "number", { min: 1 })}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-accent"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          {field("price", "Price (INR)", "number", { min: 0, placeholder: "0 for free" })}
        </div>
        {field("imageUrl", "Image URL", "url", { placeholder: "https://..." })}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            placeholder="What makes this event special?"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-ink py-3 text-sm font-semibold text-cream hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? submittingLabel : submitLabel}
        </button>
      </form>
    </div>
  );
}
