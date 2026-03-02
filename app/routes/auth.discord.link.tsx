import { LoaderFunctionArgs, redirect } from "@remix-run/node";

import { authenticator } from "~/services/auth.server";
import { getSession } from "~/services/session.server";

/**
 * Initiates the Discord OAuth flow for *linking* Discord to an existing account.
 * Sets a short-lived cookie so the callback knows to attach the identity rather
 * than creating a new session.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("userID")) return redirect("/login");

  // The actual OAuth redirect — but we need to set the link cookie before the
  // browser follows through to Discord.  We can't set it after the redirect
  // that remix-auth-oauth2 returns, so we intercept by calling authenticate
  // and appending the cookie to the redirect response headers.
  const response = (await authenticator
    .authenticate("discord", request)
    .catch((r: unknown) => {
      if (r instanceof Response) return r;
      throw r;
    })) as Response;

  const headers = new Headers(response.headers);
  headers.append(
    "Set-Cookie",
    "discord_link_mode=1; Path=/; HttpOnly; Max-Age=300; SameSite=Lax",
  );

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
