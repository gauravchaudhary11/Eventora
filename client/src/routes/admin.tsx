import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/errors";
import { Loader } from "@/components/Loader";
import {
  bookingsApi,
  eventsApi,
  usersApi,
  type Booking,
  type EventItem,
  type UserRecord,
} from "@/services/api";

type LeagueStanding = {
  bookingId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  rank: number;
};

function calculateLeagueStandings(
  tournament: NonNullable<EventItem["tournament"]>,
): LeagueStanding[] {
  const table = new Map<string, LeagueStanding>();

  for (const team of tournament.participants || []) {
    table.set(team.bookingId, {
      bookingId: team.bookingId,
      name: team.name,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      rank: 0,
    });
  }

  for (const match of tournament.matches || []) {
    if (
      !match.matchId.startsWith("L") ||
      match.status !== "completed" ||
      !match.teamA ||
      !match.teamB ||
      !match.winnerBookingId
    ) {
      continue;
    }

    const winner = table.get(match.winnerBookingId);
    const loserId =
      match.winnerBookingId === match.teamA.bookingId
        ? match.teamB.bookingId
        : match.teamA.bookingId;
    const loser = table.get(loserId);

    if (!winner || !loser) continue;

    winner.played += 1;
    winner.won += 1;
    winner.points += 2;
    loser.played += 1;
    loser.lost += 1;
  }

  return [...table.values()]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.won !== a.won) return b.won - a.won;
      return a.name.localeCompare(b.name);
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export const Route = createFileRoute("/admin")({
  component: () => (
    <ProtectedRoute>
      <AdminPage />
    </ProtectedRoute>
  ),
});

function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sportsEvents, setSportsEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bookingSavingId, setBookingSavingId] = useState<string | null>(null);
  const [tournamentSavingId, setTournamentSavingId] = useState<string | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [usersData, bookingsData] = await Promise.all([usersApi.list(), bookingsApi.listAll()]);
      setUsers(usersData);
      setBookings(bookingsData);
      const allEvents = await eventsApi.list();
      setSportsEvents(allEvents.filter((event) => event.category === "Sports"));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Couldn't load admin data"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, [user?.role]);

  const updateRole = async (target: UserRecord, role: UserRecord["role"]) => {
    setSavingId(target._id);
    try {
      const updated = await usersApi.updateRole(target._id, role);
      setUsers((current) => current.map((entry) => (entry._id === updated._id ? updated : entry)));
      toast.success(`${updated.email} is now ${updated.role}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Couldn't update role"));
    } finally {
      setSavingId(null);
    }
  };

  const updateBooking = async (
    id: string,
    action: "confirm" | "reject",
    paymentStatus?: "paid" | "non-paid",
  ) => {
    setBookingSavingId(id);
    try {
      if (action === "confirm") {
        await bookingsApi.confirm(id, paymentStatus);
        toast.success("Booking accepted");
      } else {
        await bookingsApi.reject(id);
        toast.success("Booking rejected");
      }
      const refreshed = await bookingsApi.listAll();
      setBookings(refreshed);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Couldn't update booking"));
    } finally {
      setBookingSavingId(null);
    }
  };

  const reloadSportsEvents = async () => {
    const allEvents = await eventsApi.list();
    setSportsEvents(allEvents.filter((event) => event.category === "Sports"));
  };

  const generateTournament = async (eventId: string, format: "knockout" | "league") => {
    setTournamentSavingId(`${eventId}-${format}`);
    try {
      await eventsApi.generateTournament(eventId, format);
      await reloadSportsEvents();
      toast.success(`${format === "knockout" ? "Knockout" : "League"} fixtures generated`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Couldn't generate tournament"));
    } finally {
      setTournamentSavingId(null);
    }
  };

  const recordMatchResult = async (eventId: string, matchId: string, winnerBookingId: string) => {
    setTournamentSavingId(`${eventId}-${matchId}`);
    try {
      await eventsApi.recordMatchResult(eventId, matchId, winnerBookingId);
      await reloadSportsEvents();
      toast.success("Match result updated");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Couldn't save match result"));
    } finally {
      setTournamentSavingId(null);
    }
  };

  const generateLeagueKnockouts = async (eventId: string) => {
    setTournamentSavingId(`${eventId}-league-knockouts`);
    try {
      await eventsApi.generateLeagueKnockouts(eventId);
      await reloadSportsEvents();
      toast.success("Top-4 knockout fixtures generated");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Couldn't generate knockouts"));
    } finally {
      setTournamentSavingId(null);
    }
  };

  if (loading) {
    return <Loader label="Loading admin panel…" />;
  }

  if (user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
          <h1 className="font-display text-4xl">Admin only</h1>
          <p className="mt-3 text-muted-foreground">
            This panel is only available to admin accounts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-4xl">Admin control</h1>
          <p className="mt-2 text-muted-foreground">
            Manage who can publish events and keep your hosting team organized.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-soft">
          Seed admin and secret signup are both enabled from the backend config.
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_120px_120px] gap-4 border-b border-border px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>User</span>
          <span>Status</span>
          <span>Role</span>
          <span className="text-right">Action</span>
        </div>

        <div className="divide-y divide-border">
          {users.map((entry) => {
            const isAdmin = entry.role === "admin";
            const isSaving = savingId === entry._id;
            const isSelf = entry._id === user.id;

            return (
              <div
                key={entry._id}
                className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_120px_120px] gap-4 px-5 py-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{entry.name}</p>
                  <p className="truncate text-muted-foreground">{entry.email}</p>
                </div>
                <div className="flex items-center">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${entry.isVerified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                  >
                    {entry.isVerified ? "Verified" : "Pending"}
                  </span>
                </div>
                <div className="flex items-center">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${isAdmin ? "bg-ink text-cream" : "bg-muted text-foreground"}`}
                  >
                    {entry.role}
                  </span>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    disabled={isSaving || isSelf}
                    onClick={() => updateRole(entry, isAdmin ? "user" : "admin")}
                    className="rounded-xl border border-border px-3 py-2 text-xs font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSelf ? "Current" : isAdmin ? "Make user" : "Make admin"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-2xl">Booking approvals</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review pending requests, confirm paid entries, or reject bookings that should not go
            through.
          </p>
        </div>

        <div className="divide-y divide-border">
          {bookings.length === 0 && (
            <div className="px-5 py-8 text-sm text-muted-foreground">No bookings yet.</div>
          )}

          {bookings.map((booking) => {
            const event = booking.eventId;
            const attendee = booking.userId;
            const isPending = booking.status === "pending";
            const isSaving = bookingSavingId === booking._id;
            const paymentSummary =
              booking.paymentStatus === "paid"
                ? `${booking.paymentMethod || "paid"}${booking.paymentReference ? ` · ${booking.paymentReference}` : ""}`
                : "payment pending";

            return (
              <div
                key={booking._id}
                className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_160px_220px]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{event?.title || "Event"}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {attendee?.name || "Guest"} · {attendee?.email || "No email"}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {event?.location || "Location pending"} · Booking #{booking._id.slice(-6)}
                  </p>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-foreground">{booking.status}</p>
                  <p className="text-muted-foreground">{paymentSummary}</p>
                </div>
                <div className="flex items-center">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      booking.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-800"
                        : booking.status === "cancelled"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={!isPending || isSaving}
                    onClick={() => updateBooking(booking._id, "confirm", booking.paymentStatus)}
                    className="rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-cream transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={booking.status === "cancelled" || isSaving}
                    onClick={() => updateBooking(booking._id, "reject")}
                    className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-2xl">Sports tournaments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Once all team slots are confirmed for a sports event, generate automatic knockout
            brackets or league fixtures.
          </p>
        </div>

        <div className="divide-y divide-border">
          {sportsEvents.length === 0 && (
            <div className="px-5 py-8 text-sm text-muted-foreground">No sports events found.</div>
          )}

          {sportsEvents.map((event) => {
            const confirmedTeams = bookings.filter(
              (booking) => booking.eventId?._id === event._id && booking.status === "confirmed",
            );
            const slotsFilled = confirmedTeams.length >= event.totalSeats;
            const tournament = event.tournament;
            const leagueStandings =
              tournament?.enabled && tournament.format === "league"
                ? calculateLeagueStandings(tournament)
                : [];
            const canGenerateLeagueKnockouts =
              leagueStandings.filter((team) => team.played > 0).length >= 4;

            return (
              <div key={event._id} className="px-5 py-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-display text-2xl">{event.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {confirmedTeams.length} / {event.totalSeats} teams confirmed ·{" "}
                      {event.location}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tournament?.enabled
                        ? `${tournament.format} fixtures generated`
                        : slotsFilled
                          ? "Ready to generate fixtures"
                          : "Waiting for all team slots to be confirmed"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!slotsFilled || tournamentSavingId === `${event._id}-knockout`}
                      onClick={() => generateTournament(event._id, "knockout")}
                      className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-cream transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Generate knockout
                    </button>
                    <button
                      type="button"
                      disabled={!slotsFilled || tournamentSavingId === `${event._id}-league`}
                      onClick={() => generateTournament(event._id, "league")}
                      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Generate league
                    </button>
                  </div>
                </div>

                {tournament?.enabled && (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-border">
                    <div className="grid gap-4 border-b border-border bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid-cols-[150px_minmax(0,1.4fr)_150px_200px]">
                      <span>Round</span>
                      <span>Teams</span>
                      <span>Status</span>
                      <span className="text-right">Winner</span>
                    </div>
                    <div className="divide-y divide-border">
                      {tournament.matches.map((match) => {
                        const winner = match.winnerBookingId;
                        const selectableTeams = [match.teamA, match.teamB].filter(
                          Boolean,
                        ) as Array<{ bookingId: string; name: string }>;
                        const saveKey = `${event._id}-${match.matchId}`;

                        return (
                          <div
                            key={match.matchId}
                            className="grid gap-4 px-4 py-4 md:grid-cols-[150px_minmax(0,1.4fr)_150px_200px] md:items-center"
                          >
                            <div>
                              <p className="font-medium text-foreground">{match.roundLabel}</p>
                              <p className="text-xs text-muted-foreground">{match.matchId}</p>
                            </div>
                            <div className="text-sm">
                              <p className="font-medium text-foreground">
                                {match.teamA?.name || "TBD"}
                              </p>
                              <p className="text-muted-foreground">vs</p>
                              <p className="font-medium text-foreground">
                                {match.teamB?.name || "TBD"}
                              </p>
                            </div>
                            <div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  match.status === "completed"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {match.status}
                              </span>
                            </div>
                            <div className="flex justify-end">
                              <select
                                value={winner || ""}
                                disabled={
                                  selectableTeams.length < 2 || tournamentSavingId === saveKey
                                }
                                onChange={(e) => {
                                  if (e.target.value)
                                    recordMatchResult(event._id, match.matchId, e.target.value);
                                }}
                                className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:border-accent md:max-w-[200px]"
                              >
                                <option value="">Select winner</option>
                                {selectableTeams.map((team) => (
                                  <option key={team.bookingId} value={team.bookingId}>
                                    {team.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {tournament.format === "league" && (
                      <div className="border-t border-border bg-background/70 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h4 className="font-display text-2xl">Points table</h4>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Top 4 teams qualify for knockout fixtures.
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={
                              !canGenerateLeagueKnockouts ||
                              tournamentSavingId === `${event._id}-league-knockouts`
                            }
                            onClick={() => generateLeagueKnockouts(event._id)}
                            className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-cream transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Generate top-4 knockout
                          </button>
                        </div>
                        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                          <div className="grid min-w-[620px] grid-cols-[56px_minmax(180px,1fr)_70px_70px_70px_80px] gap-2 bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <span>Rank</span>
                            <span>Team</span>
                            <span>P</span>
                            <span>W</span>
                            <span>L</span>
                            <span>Pts</span>
                          </div>
                          {leagueStandings.map((team) => (
                            <div
                              key={team.bookingId}
                              className={`grid min-w-[620px] grid-cols-[56px_minmax(180px,1fr)_70px_70px_70px_80px] gap-2 border-t border-border px-3 py-2 text-sm ${team.rank <= 4 ? "bg-emerald-50/70" : ""}`}
                            >
                              <span className="font-semibold">{team.rank}</span>
                              <span className="truncate">{team.name}</span>
                              <span>{team.played}</span>
                              <span>{team.won}</span>
                              <span>{team.lost}</span>
                              <span className="font-semibold">{team.points}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
