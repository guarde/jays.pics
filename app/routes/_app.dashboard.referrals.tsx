import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Copy, Gift, RefreshCw, Users } from "lucide-react";
import { v4 } from "uuid";

import { useToast } from "~/components/toast";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { prisma } from "~/services/database.server";
import { getSession, getUserBySession } from "~/services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const user = await getUserBySession(session);

  const url = new URL(request.url);
  const query = url.searchParams.get("regenerate");

  if (query !== null) {
    await prisma.referrerProfile.update({
      where: { userId: user!.id },
      data: { referral_code: v4() },
    });
    return redirect("/dashboard/referrals");
  }

  const referrals = await prisma.referral.findMany({
    where: { referrer_id: user!.referrer_profile?.id },
    select: {
      created_at: true,
      referred: { select: { id: true, username: true, avatar_url: true } },
    },
  });

  return { data: { referrals }, user };
}

export default function Referrals() {
  const { user, data } = useLoaderData<typeof loader>();
  const { showToast } = useToast();

  function copyCode() {
    navigator.clipboard.writeText(user?.referrer_profile?.referral_code ?? "");
    showToast("Referral code copied", "success");
  }

  const used = data.referrals.length;
  const limit = user?.referrer_profile?.referral_limit ?? 0;

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="border-b border-border px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Referrals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {used} of {limit} referral{limit !== 1 ? "s" : ""} used
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {limit - used} remaining
          </span>
          <div className="h-1.5 w-24 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${limit > 0 ? (used / limit) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Referral code card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Your Referral Code</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this code with someone you'd like to invite. They'll use it
            during registration.
          </p>
          <div className="flex gap-2">
            <Input
              value={user?.referrer_profile?.referral_code ?? ""}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              className="gap-2 shrink-0"
              onClick={copyCode}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>
            <Button asChild variant="outline" className="gap-2 shrink-0">
              <Link to="?regenerate">
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </Link>
            </Button>
          </div>
        </div>

        {/* Referrals list */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Referred Users</h3>
            {data.referrals.length > 0 && (
              <span className="ml-1 text-xs bg-secondary text-secondary-foreground rounded-md px-1.5 py-0.5 font-medium">
                {data.referrals.length}
              </span>
            )}
          </div>

          {data.referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No referrals yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Share your code to invite people
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {data.referrals.map((referral) => (
                <a
                  key={referral.referred.id}
                  href={`/profile/${referral.referred.username}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/40 transition-colors"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={`/avatar/${referral.referred.id}`} />
                    <AvatarFallback className="text-xs">
                      {referral.referred.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {referral.referred.username}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(referral.created_at).toLocaleDateString()}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
