import type { LinksFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useNavigation,
  useRouteError,
  useRouteLoaderData,
} from "@remix-run/react";
import { useEffect, useState } from "react";

import ErrorPage from "./components/error-page";
import "./tailwind.css";
import { LoadingOverlay } from "./components/loading";
import { ToastProvider } from "./components/toast";
import { CookieBanner } from "./components/cookie-banner";

export async function loader() {
  return json({
    siteName: process.env.SITE_NAME ?? "jays.pics",
    baseDomain: process.env.BASE_DOMAIN ?? "jays.pics",
  });
}

export function useRootData() {
  return useRouteLoaderData<typeof loader>("root");
}

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [ThemeToggle, setThemeToggle] = useState(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      return savedTheme
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    }
    return "light";
  });
  const navigation = useNavigation();

  useEffect(() => {
    ThemeToggle ? "light" : "dark";
    if (localStorage.getItem("theme") === ThemeToggle) {
      return;
    }
    document.documentElement.setAttribute("data-theme", ThemeToggle);
    localStorage.setItem("theme", ThemeToggle);
  }, [ThemeToggle]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ToastProvider>
          {children}
          {navigation.state !== "idle" && <LoadingOverlay />}
        </ToastProvider>
        <CookieBanner />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  let title = "Something went wrong";
  let message: string | undefined;
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = error.data?.message ?? error.statusText;
  } else if (error instanceof Error) {
    message = error.message;
    stack = error.stack;
  }

  useEffect(() => {
    if (message) {
      fetch("/api/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, stack }),
      }).catch(() => {});
    }
  }, [message, stack]);

  return (
    <Layout>
      <ErrorPage title={title} message={message} />
    </Layout>
  );
}
