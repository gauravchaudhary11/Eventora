import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/errors";
import toast from "react-hot-toast";
import { Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type ResetStep = "request" | "confirm" | null;

function LoginPage() {
  const { login, verifyOtp, forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [resetStep, setResetStep] = useState<ResetStep>(null);
  const [resetForm, setResetForm] = useState({
    email: "",
    otp: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Valid email required";
    if (form.password.length < 6) e.password = "Min 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      navigate({ to: "/" });
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Login failed");
      if (message.toLowerCase().includes("verify your email")) {
        setPendingEmail(form.email);
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingEmail || otp.trim().length < 6) {
      toast.error("Enter the 6-digit OTP sent to your email");
      return;
    }

    setVerifying(true);
    try {
      await verifyOtp(pendingEmail, otp.trim());
      toast.success("Email verified. You're in.");
      navigate({ to: "/" });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "OTP verification failed"));
    } finally {
      setVerifying(false);
    }
  };

  const startForgotPassword = () => {
    setResetForm({
      email: form.email,
      otp: "",
      password: "",
      confirmPassword: "",
    });
    setResetStep("request");
  };

  const onSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(resetForm.email)) {
      toast.error("Enter a valid email address");
      return;
    }

    setResetLoading(true);
    try {
      const response = await forgotPassword(resetForm.email);
      toast.success(response.message || "Reset OTP sent");
      setResetStep("confirm");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Could not send reset OTP"));
    } finally {
      setResetLoading(false);
    }
  };

  const onResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetForm.otp.trim().length < 6) {
      toast.error("Enter the 6-digit OTP");
      return;
    }
    if (resetForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (resetForm.password !== resetForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setResetLoading(true);
    try {
      const response = await resetPassword(
        resetForm.email,
        resetForm.otp.trim(),
        resetForm.password,
      );
      toast.success(response.message || "Password reset successful");
      setResetStep(null);
      setResetForm({ email: "", otp: "", password: "", confirmPassword: "" });
      setForm((current) => ({ ...current, email: resetForm.email, password: "" }));
      setShowPwd(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Password reset failed"));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-hero-aura opacity-70" />
      <div className="absolute -left-32 top-20 -z-10 h-80 w-80 rounded-full bg-coral/30 blur-3xl animate-float-slow" />
      <div className="absolute -right-20 bottom-10 -z-10 h-96 w-96 rounded-full bg-violet-deep/25 blur-3xl animate-float-slower" />

      <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl grid-cols-1 items-center gap-12 px-6 py-10 lg:grid-cols-2">
        <div className="hidden lg:block animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Welcome back to Eventora
          </div>
          <h2 className="mt-6 font-display text-6xl leading-[0.95]">
            Your next <span className="text-gradient-warm italic">favorite</span>
            <br /> night out, one tap away.
          </h2>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Log in to continue booking, hosting, and discovering events crafted for moments worth
            remembering.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { n: "10k+", l: "Events" },
              { n: "50+", l: "Cities" },
              { n: "25k+", l: "Guests" },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur"
              >
                <div className="font-display text-3xl">{s.n}</div>
                <div className="text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-md justify-self-center lg:justify-self-end animate-fade-up [animation-delay:120ms]">
          <div className="rounded-3xl border border-border bg-card/95 p-8 shadow-soft backdrop-blur-md">
            <h1 className="font-display text-4xl">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">Log in to book and host events.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email</label>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-input bg-background pl-11 pr-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                  />
                </div>
                {errors.email && <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Password</label>
                <div className="group relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
                  <input
                    type={showPwd ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-input bg-background pl-11 pr-11 py-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-destructive">{errors.password}</p>
                )}
                <div className="mt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={startForgotPassword}
                    className="text-xs font-semibold text-accent hover:underline underline-offset-4"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-2xl bg-ink py-3.5 text-sm font-semibold text-cream shadow-soft transition-all hover:shadow-lift hover:scale-[1.01] active:scale-95 disabled:opacity-50"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-cta transition-transform duration-500 group-hover:translate-x-0" />
                <span className="relative">{loading ? "Logging in…" : "Log in →"}</span>
              </button>

              <div className="relative my-2 flex items-center">
                <div className="flex-1 border-t border-border" />
                <span className="px-3 text-xs text-muted-foreground">OR</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <p className="text-center text-sm text-muted-foreground">
                New here?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-accent hover:underline underline-offset-4"
                >
                  Create an account
                </Link>
              </p>
            </form>

            {resetStep && (
              <div className="mt-6 rounded-2xl border border-border bg-background/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Reset password</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {resetStep === "request"
                        ? "Send a reset OTP to your email."
                        : `We sent an OTP to ${resetForm.email}. Set a new password below.`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetStep(null)}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Back
                  </button>
                </div>

                {resetStep === "request" ? (
                  <form onSubmit={onSendResetOtp} className="mt-4 space-y-3">
                    <input
                      type="email"
                      value={resetForm.email}
                      onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                    />
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {resetLoading ? "Sending OTP…" : "Send reset OTP"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={onResetPassword} className="mt-4 space-y-3">
                    <input
                      type="text"
                      value={resetForm.otp}
                      onChange={(e) => setResetForm({ ...resetForm, otp: e.target.value })}
                      placeholder="6-digit OTP"
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                    />
                    <input
                      type="password"
                      value={resetForm.password}
                      onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
                      placeholder="New password"
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                    />
                    <input
                      type="password"
                      value={resetForm.confirmPassword}
                      onChange={(e) =>
                        setResetForm({ ...resetForm, confirmPassword: e.target.value })
                      }
                      placeholder="Confirm new password"
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                    />
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full rounded-2xl bg-ink py-3 text-sm font-semibold text-cream hover:opacity-95 disabled:opacity-50"
                    >
                      {resetLoading ? "Resetting…" : "Reset password"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {pendingEmail && (
              <form
                onSubmit={onVerifyOtp}
                className="mt-6 rounded-2xl border border-border bg-background/70 p-4"
              >
                <p className="text-sm font-medium">Verify your email</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  We sent an OTP to {pendingEmail}. Enter it here to finish login.
                </p>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit OTP"
                  className="mt-3 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                />
                <button
                  type="submit"
                  disabled={verifying}
                  className="mt-3 w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {verifying ? "Verifying…" : "Verify OTP"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
