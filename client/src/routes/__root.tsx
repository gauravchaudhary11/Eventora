import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-8xl text-foreground">404</h1>
        <p className="mt-3 text-muted-foreground">This event has left the venue.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream hover:opacity-90"
        >
          Back to discover
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Eventora — Discover & host unforgettable events" },
      {
        name: "description",
        content:
          "Find concerts, workshops, meetups and more. Eventora is the modern way to discover and host events.",
      },
      { property: "og:title", content: "Eventora" },
      { property: "og:description", content: "Discover & host unforgettable events." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Eventora — crafted for moments worth remembering.
        </footer>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "oklch(0.18 0.025 270)",
            color: "oklch(0.985 0.012 85)",
            borderRadius: "12px",
          },
        }}
      />
    </AuthProvider>
  );
}
