import { LoaderFunctionArgs, MetaFunction, redirect } from "@remix-run/node";
import { Outlet, useLoaderData, useRouteLoaderData } from "@remix-run/react";

import { DashboardNavbar } from "~/components/dashboard-navbar";
import { Sidebar } from "~/components/ui/sidebar";
import { StorageLimitBanner } from "~/components/storage-limit-banner";
import {
  destroySession,
  getSession,
  getUserBySession,
} from "~/services/session.server";

export const meta: MetaFunction = ({ matches }) => {
  const rootData = matches.find((m) => m.id === "root")?.data as
    | { siteName?: string }
    | undefined;
  const siteName = rootData?.siteName ?? "jays.pics";
  return [
    { title: `Dashboard | ${siteName}` },
    { name: "description", content: "Invite-only Image Hosting" },
    {
      name: "theme-color",
      content: "#e05cd9",
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  if (!session.has("userID")) return redirect("/");

  const user = await getUserBySession(session);

  if (user === null)
    return redirect("/", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });

  const now = Date.now();

  return {
    user,
    now,
    version: process.env.VERSION ?? "0.0.0",
    siteName: process.env.SITE_NAME ?? "jays.pics",
  };
}

export default function Application() {
  const { user, version, siteName } = useLoaderData<typeof loader>();

  return (
    <div className="flex h-screen overflow-hidden flex-col md:flex-row">
      <DashboardNavbar user={user} version={version} siteName={siteName} />
      <Sidebar
        user={user}
        version={version}
        siteName={siteName}
        className="border-r hidden md:flex"
      />
      <div className="flex-grow rounded w-full h-full overflow-auto">
        <Outlet />
      </div>
      <StorageLimitBanner
        spaceUsed={user.space_used}
        maxSpace={user.max_space}
      />
    </div>
  );
}

export function useAppLoaderData() {
  return useRouteLoaderData<typeof loader>("routes/_app");
}
