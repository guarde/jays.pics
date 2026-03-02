import { LoaderFunctionArgs, MetaFunction, redirect } from "@remix-run/node";
import { Outlet, useLoaderData, useRouteLoaderData } from "@remix-run/react";

import { AdminNavbar } from "~/components/admin-navbar";
import { SidebarAdmin } from "~/components/ui/sidebar-admin";
import { can, perms } from "~/lib/permissions";
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
    { title: `Admin Dashboard | ${siteName}` },
    { name: "description", content: "Administration Dashboard" },
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

  if (!user || !can(user.permissions, perms.bits.CanViewAdminDashboard))
    return redirect("/");

  if (user === null)
    return redirect("/", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });

  return { user, siteName: process.env.SITE_NAME ?? "jays.pics" };
}

export default function AdminDashboard() {
  const { user, siteName } = useLoaderData<typeof loader>();

  return (
    <div className="flex h-screen overflow-hidden flex-col md:flex-row">
      <AdminNavbar user={user} siteName={siteName} />
      <SidebarAdmin
        user={user}
        siteName={siteName}
        className="border-r hidden md:flex"
      />
      <div className="flex-grow w-full h-full overflow-auto">
        <div className="container mx-auto px-4 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function useAdminLoader() {
  return useRouteLoaderData<typeof loader>("routes/_admin");
}
