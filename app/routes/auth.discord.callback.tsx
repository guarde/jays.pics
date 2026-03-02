import { LoaderFunctionArgs, redirect } from "@remix-run/node";

import { authenticator } from "~/services/auth.server";
import { prisma } from "~/services/database.server";
import { commitSession, getSession } from "~/services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const isLinkMode = cookieHeader
    .split(";")
    .some((c) => c.trim() === "discord_link_mode=1");

  let userId: string;
  try {
    userId = await authenticator.authenticate("discord", request);
  } catch (error) {
    if (error instanceof Response) throw error;
    return redirect("/login?error=discord_failed");
  }

  const session = await getSession(cookieHeader);

  // Check whether this account still needs referral activation
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { discord_pending: true },
  });

  session.set("userID", userId);

  let redirectTo = "/dashboard/index";
  if (user?.discord_pending) redirectTo = "/discord/activate";
  else if (isLinkMode) redirectTo = "/dashboard/settings";

  const headers = new Headers();
  headers.append("Set-Cookie", await commitSession(session));

  if (isLinkMode) {
    // Clear the link-mode flag
    headers.append(
      "Set-Cookie",
      "discord_link_mode=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax",
    );
  }

  return redirect(redirectTo, { headers });
}
