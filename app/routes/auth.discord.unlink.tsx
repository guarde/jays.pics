import { ActionFunctionArgs, redirect } from "@remix-run/node";

import { prisma } from "~/services/database.server";
import { getSession, getUserBySession } from "~/services/session.server";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("userID")) return redirect("/login");

  const user = await getUserBySession(session);
  if (!user) return redirect("/login");

  await prisma.discordProfile.deleteMany({ where: { userId: user.id } });

  return redirect("/dashboard/settings");
}
