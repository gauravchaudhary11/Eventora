export function Loader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="h-10 w-10 rounded-full border-2 border-muted border-t-accent animate-spin" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
