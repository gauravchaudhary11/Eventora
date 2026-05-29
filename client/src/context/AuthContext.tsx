import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, type AuthSession } from "@/services/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    options?: { asAdmin?: boolean; adminSecret?: string },
  ) => Promise<{ message: string; emailSent?: boolean; verified?: boolean }>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword: (email: string, otp: string, password: string) => Promise<{ message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "eventora_token";
const USER_KEY = "eventora_user";

function toUser(session: AuthSession): User {
  return {
    id: session._id,
    name: session.name,
    email: session.email,
    role: session.role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (t) setToken(t);
    if (u) {
      try {
        setUser(JSON.parse(u));
      } catch {
        /* ignore */
      }
    }
    setLoading(false);

    const handleAuthReset = () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    };

    window.addEventListener("eventora-auth-reset", handleAuthReset);
    return () => window.removeEventListener("eventora-auth-reset", handleAuthReset);
  }, []);

  const persist = (t: string, u: User) => {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    persist(res.token, toUser(res));
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    options?: { asAdmin?: boolean; adminSecret?: string },
  ) => {
    return await authApi.register({
      name,
      email,
      password,
      role: options?.asAdmin ? "admin" : "user",
      adminSecret: options?.adminSecret,
    });
  };

  const verifyOtp = async (email: string, otp: string) => {
    const res = await authApi.verifyOtp({ email, otp });
    persist(res.token, toUser(res));
  };

  const forgotPassword = async (email: string) => {
    return await authApi.forgotPassword({ email });
  };

  const resetPassword = async (email: string, otp: string, password: string) => {
    return await authApi.resetPassword({ email, otp, password });
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        register,
        verifyOtp,
        forgotPassword,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
