import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/errors";
import toast from "react-hot-toast";
import { User, Mail, Lock, Eye, EyeOff, PartyPopper, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

const FIELDS = [
  {
    name: "name" as const,
    label: "Full name",
    type: "text",
    icon: User,
    placeholder: "Ada Lovelace",
  },
  {
    name: "email" as const,
    label: "Email",
    type: "email",
    icon: Mail,
    placeholder: "you@example.com",
  },
  {
    name: "password" as const,
    label: "Password",
    type: "password",
    icon: Lock,
    placeholder: "min. 6 characters",
  },
];

function RegisterPage() {
  const { register, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [asAdmin, setAsAdmin] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Name required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Valid email required";
    if (form.password.length < 6) e.password = "Min 6 characters";
    if (asAdmin && adminSecret.trim().length < 4) e.adminSecret = "Admin access key required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await register(form.name.trim(), form.email, form.password, {
        asAdmin,
        adminSecret: asAdmin ? adminSecret.trim() : undefined,
      });
      setPendingEmail(form.email);
      toast.success(res?.message || "Account created. Check your email for the OTP.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Registration failed"));
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
      toast.success("Account verified!");
      navigate({ to: "/" });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "OTP verification failed"));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-hero-aura opacity-70" />
      <div className="absolute -right-32 top-20 -z-10 h-80 w-80 rounded-full bg-amber-glow/30 blur-3xl animate-float-slow" />
      <div className="absolute -left-20 bottom-10 -z-10 h-96 w-96 rounded-full bg-coral/25 blur-3xl animate-float-slower" />

      <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl grid-cols-1 items-center gap-12 px-6 py-10 lg:grid-cols-2">
        <div className="hidden lg:block animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium backdrop-blur">
            <PartyPopper className="h-3.5 w-3.5 text-accent" /> Join 25,000+ event lovers
          </div>
          <h2 className="mt-6 font-display text-6xl leading-[0.95]">
            Start the
            <br /> <span className="text-gradient-warm italic">good times</span> today.
          </h2>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Create an account to book events, save favorites, and host your own gatherings — all in
            one place.
          </p>
        </div>

        <div className="w-full max-w-md justify-self-center lg:justify-self-end animate-fade-up [animation-delay:120ms]">
          <div className="rounded-3xl border border-border bg-card/95 p-8 shadow-soft backdrop-blur-md">
            <h1 className="font-display text-4xl">Create account</h1>
            <p className="mt-2 text-sm text-muted-foreground">Join Eventora in seconds.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              {FIELDS.map(({ name, label, type, icon: Icon, placeholder }) => {
                const isPwd = name === "password";
                return (
                  <div key={name}>
                    <label className="mb-1.5 block text-sm font-medium">{label}</label>
                    <div className="group relative">
                      <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
                      <input
                        type={isPwd && showPwd ? "text" : type}
                        value={form[name]}
                        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full rounded-2xl border border-input bg-background pl-11 pr-11 py-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                      />
                      {isPwd && (
                        <button
                          type="button"
                          onClick={() => setShowPwd((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                    {errors[name] && (
                      <p className="mt-1.5 text-xs text-destructive">{errors[name]}</p>
                    )}
                  </div>
                );
              })}

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={asAdmin}
                    onChange={(e) => setAsAdmin(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-input text-accent focus:ring-accent"
                  />
                  <div>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <ShieldCheck className="h-4 w-4 text-accent" />
                      Create admin account
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Use this only if you have the admin access key for Eventora.
                    </p>
                  </div>
                </label>

                {asAdmin && (
                  <div className="mt-4">
                    <label className="mb-1.5 block text-sm font-medium">Admin access key</label>
                    <input
                      type="password"
                      value={adminSecret}
                      onChange={(e) => setAdminSecret(e.target.value)}
                      placeholder="Enter admin access key"
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                    />
                    {errors.adminSecret && (
                      <p className="mt-1.5 text-xs text-destructive">{errors.adminSecret}</p>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-2xl bg-ink py-3.5 text-sm font-semibold text-cream shadow-soft transition-all hover:shadow-lift hover:scale-[1.01] active:scale-95 disabled:opacity-50"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-cta transition-transform duration-500 group-hover:translate-x-0" />
                <span className="relative">{loading ? "Creating…" : "Create account →"}</span>
              </button>

              <p className="text-center text-sm text-muted-foreground">
                Already have one?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-accent hover:underline underline-offset-4"
                >
                  Log in
                </Link>
              </p>
            </form>

            {pendingEmail && (
              <form
                onSubmit={onVerifyOtp}
                className="mt-6 rounded-2xl border border-border bg-background/70 p-4"
              >
                <p className="text-sm font-medium">Verify your email</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter the OTP sent to {pendingEmail} to activate your account.
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
