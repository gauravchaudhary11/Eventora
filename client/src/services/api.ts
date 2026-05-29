import axios from "axios";

type ViteImportMeta = ImportMeta & {
  env?: {
    VITE_API_BASE_URL?: string;
  };
};

// API base URL — can be overridden via VITE_API_BASE_URL
const rawApiBaseUrl =
  (typeof import.meta !== "undefined" && (import.meta as ViteImportMeta).env?.VITE_API_BASE_URL) ||
  (typeof window !== "undefined" && window.location.hostname.endsWith("vercel.app")
    ? "https://eventora-44wb.onrender.com/api"
    : undefined) ||
  "http://localhost:5000/api";

const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "").endsWith("/api")
  ? rawApiBaseUrl.replace(/\/+$/, "")
  : `${rawApiBaseUrl.replace(/\/+$/, "")}/api`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("eventora_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      localStorage.removeItem("eventora_token");
      localStorage.removeItem("eventora_user");
      window.dispatchEvent(new Event("eventora-auth-reset"));
    }

    return Promise.reject(error);
  },
);

// ---- Auth ----
export interface AuthSession {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  token: string;
  message?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: "user" | "admin";
  adminSecret?: string;
}

export const authApi = {
  register: (data: RegisterData) => api.post("/auth/register", data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthSession>("/auth/login", data).then((r) => r.data),
  verifyOtp: (data: { email: string; otp: string }) =>
    api.post<AuthSession>("/auth/verify-otp", data).then((r) => r.data),
  forgotPassword: (data: { email: string }) =>
    api.post("/auth/forgot-password", data).then((r) => r.data),
  resetPassword: (data: { email: string; otp: string; password: string }) =>
    api.post("/auth/reset-password", data).then((r) => r.data),
};

// ---- Events ----
export interface EventItem {
  _id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  description: string;
  imageUrl: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  tournament?: {
    enabled: boolean;
    format: "knockout" | "league" | null;
    status: "draft" | "generated" | "completed";
    generatedAt?: string | null;
    participants: Array<{
      bookingId: string;
      name: string;
    }>;
    matches: Array<{
      matchId: string;
      round: number;
      roundLabel: string;
      bracketIndex: number;
      teamA?: { bookingId: string; name: string } | null;
      teamB?: { bookingId: string; name: string } | null;
      winnerBookingId?: string | null;
      status: "pending" | "completed";
      nextMatchId?: string | null;
      nextSlot?: "teamA" | "teamB" | null;
    }>;
  };
}

export const eventsApi = {
  list: (params?: { category?: string; location?: string }) =>
    api.get<EventItem[]>("/events", { params }).then((r) => r.data),
  get: (id: string) => api.get<EventItem>(`/events/${id}`).then((r) => r.data),
  create: (data: Omit<EventItem, "_id">) =>
    api.post<EventItem>("/events", data).then((r) => r.data),
  update: (id: string, data: Omit<EventItem, "_id">) =>
    api.put<EventItem>(`/events/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/events/${id}`).then((r) => r.data),
  generateTournament: (id: string, format: "knockout" | "league") =>
    api.post<EventItem>(`/events/${id}/tournament/generate`, { format }).then((r) => r.data),
  generateLeagueKnockouts: (id: string) =>
    api.post<EventItem>(`/events/${id}/tournament/league-knockouts`, {}).then((r) => r.data),
  recordMatchResult: (eventId: string, matchId: string, winnerBookingId: string) =>
    api
      .put<EventItem>(`/events/${eventId}/tournament/matches/${matchId}/result`, {
        winnerBookingId,
      })
      .then((r) => r.data),
};

// ---- Bookings ----
export interface Booking {
  _id: string;
  eventId: EventItem;
  userId?: {
    _id: string;
    name: string;
    email: string;
  };
  status: "pending" | "confirmed" | "cancelled";
  paymentStatus: "non-paid" | "paid";
  paymentMethod?: "upi" | "card" | "wallet" | "cash" | "none" | "netbanking";
  paymentReference?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  totalPrice: number;
  createdAt: string;
}

export interface UserRecord {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  isVerified: boolean;
  createdAt?: string;
}

export type BookingPaymentStatus = "non-paid" | "paid";
export type BookingPaymentMethod = "upi" | "card" | "wallet" | "cash" | "none";

export const bookingsApi = {
  sendOtp: () =>
    api.post<{ message: string; emailSent?: boolean; otp?: string }>("/bookings/send-otp", {}).then((r) => r.data),
  create: (eventId: string, otp: string) =>
    api.post("/bookings", { eventId, otp }).then((r) => r.data),
  listAll: () => api.get<Booking[]>("/bookings").then((r) => r.data),
  confirm: (id: string, paymentStatus?: BookingPaymentStatus) =>
    api
      .put<Booking>(`/bookings/${id}/confirm`, paymentStatus ? { paymentStatus } : {})
      .then((r) => r.data),
  reject: (id: string) => api.put<Booking>(`/bookings/${id}/reject`, {}).then((r) => r.data),
  mine: () => api.get<Booking[]>("/bookings/my").then((r) => r.data),
  remove: (id: string) => api.delete(`/bookings/${id}`).then((r) => r.data),
};

export const usersApi = {
  list: () => api.get<UserRecord[]>("/users").then((r) => r.data),
  updateRole: (id: string, role: UserRecord["role"]) =>
    api.patch<UserRecord>(`/users/${id}/role`, { role }).then((r) => r.data),
};
