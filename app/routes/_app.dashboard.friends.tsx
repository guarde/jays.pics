import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import {
  Check,
  Clock,
  UserMinus,
  UserPlus,
  Users,
  UserX,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { prisma } from "~/services/database.server";
import { getSession, getUserBySession } from "~/services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("userID")) return redirect("/");
  const user = await getUserBySession(session);
  if (!user) return redirect("/");

  const [accepted, incoming, outgoing] = await Promise.all([
    prisma.friendRequest.findMany({
      where: {
        OR: [
          { requester_id: user.id, status: "ACCEPTED" },
          { requested_id: user.id, status: "ACCEPTED" },
        ],
      },
      include: {
        requester: { select: { id: true, username: true } },
        requested: { select: { id: true, username: true } },
      },
    }),
    prisma.friendRequest.findMany({
      where: { requested_id: user.id, status: "PENDING" },
      orderBy: { created_at: "desc" },
      include: {
        requester: { select: { id: true, username: true } },
      },
    }),
    prisma.friendRequest.findMany({
      where: { requester_id: user.id, status: "PENDING" },
      orderBy: { created_at: "desc" },
      include: {
        requested: { select: { id: true, username: true } },
      },
    }),
  ]);

  const friends = accepted.map((r) => {
    const friend = r.requester_id === user.id ? r.requested : r.requester;
    return { requestId: r.id, ...friend };
  });

  return { userId: user.id, friends, incoming, outgoing };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("userID")) return redirect("/");
  const user = await getUserBySession(session);
  if (!user) return redirect("/");

  const formData = await request.formData();
  const type = formData.get("type");
  const requestId = formData.get("request_id") as string;

  if (type === "accept_request") {
    const req = await prisma.friendRequest.findFirst({
      where: { id: requestId, requested_id: user.id, status: "PENDING" },
    });
    if (req) {
      await prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: "ACCEPTED" },
      });
      await prisma.notification.create({
        data: {
          receiver_id: req.requester_id,
          content: `${user.username} accepted your friend request.`,
        },
      });
    }
  }

  if (type === "decline_request") {
    await prisma.friendRequest.deleteMany({
      where: { id: requestId, requested_id: user.id },
    });
  }

  if (type === "cancel_request") {
    await prisma.friendRequest.deleteMany({
      where: { id: requestId, requester_id: user.id },
    });
  }

  if (type === "remove_friend") {
    await prisma.friendRequest.deleteMany({
      where: {
        id: requestId,
        OR: [{ requester_id: user.id }, { requested_id: user.id }],
      },
    });
  }

  return redirect("/dashboard/friends");
}

export default function FriendsPage() {
  const { friends, incoming, outgoing } = useLoaderData<typeof loader>();

  return (
    <main className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Friends</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {friends.length} friend{friends.length !== 1 ? "s" : ""}
            {incoming.length > 0 && (
              <span className="ml-2 text-primary">
                · {incoming.length} pending request
                {incoming.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Pending incoming requests */}
        {incoming.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Pending Requests</h3>
              <span className="ml-1 text-xs bg-primary/10 text-primary rounded-md px-1.5 py-0.5 font-medium">
                {incoming.length}
              </span>
            </div>
            <div className="divide-y divide-border/50">
              {incoming.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage
                      src={`/avatar/${req.requester.id}`}
                      alt={req.requester.username}
                    />
                    <AvatarFallback className="text-xs">
                      {req.requester.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    to={`/profile/${req.requester.username}`}
                    className="flex-1 text-sm font-medium hover:text-primary transition-colors"
                  >
                    {req.requester.username}
                  </Link>
                  <Form method="POST" className="flex gap-2">
                    <input type="hidden" name="request_id" value={req.id} />
                    <Button
                      type="submit"
                      name="type"
                      value="accept_request"
                      size="sm"
                      className="gap-1.5 text-white"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Accept
                    </Button>
                    <Button
                      type="submit"
                      name="type"
                      value="decline_request"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      Decline
                    </Button>
                  </Form>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing requests */}
        {outgoing.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Sent Requests</h3>
              <span className="ml-1 text-xs bg-secondary text-secondary-foreground rounded-md px-1.5 py-0.5 font-medium">
                {outgoing.length}
              </span>
            </div>
            <div className="divide-y divide-border/50">
              {outgoing.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage
                      src={`/avatar/${req.requested.id}`}
                      alt={req.requested.username}
                    />
                    <AvatarFallback className="text-xs">
                      {req.requested.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    to={`/profile/${req.requested.username}`}
                    className="flex-1 text-sm font-medium hover:text-primary transition-colors"
                  >
                    {req.requested.username}
                  </Link>
                  <span className="text-xs text-muted-foreground mr-2">
                    Awaiting response
                  </span>
                  <Form method="POST">
                    <input type="hidden" name="request_id" value={req.id} />
                    <Button
                      type="submit"
                      name="type"
                      value="cancel_request"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </Form>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends list */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Friends</h3>
            {friends.length > 0 && (
              <span className="ml-1 text-xs bg-secondary text-secondary-foreground rounded-md px-1.5 py-0.5 font-medium">
                {friends.length}
              </span>
            )}
          </div>

          {friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No friends yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Visit someone's profile to send a friend request
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {friends.map((f) => (
                <div
                  key={f.requestId}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/30 transition-colors"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={`/avatar/${f.id}`} alt={f.username} />
                    <AvatarFallback className="text-xs">
                      {f.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    to={`/profile/${f.username}`}
                    className="flex-1 text-sm font-medium hover:text-primary transition-colors"
                  >
                    {f.username}
                  </Link>
                  <Form method="POST">
                    <input
                      type="hidden"
                      name="request_id"
                      value={f.requestId}
                    />
                    <Button
                      type="submit"
                      name="type"
                      value="remove_friend"
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </Form>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
