import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { z } from "zod";

import { can, perms } from "~/lib/permissions";
import { prisma } from "~/services/database.server";
import { getSession, getUserBySession } from "~/services/session.server";

const schema = z.object({
  target: z.string({ required_error: "Target ID is required" }).cuid(),
  content: z.string({ required_error: "Comment required" }).min(1),
});

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("userID")) return redirect("/");
  const user = await getUserBySession(session);

  if (!user || !can(user.permissions, perms.bits.CanComment))
    throw new Response("Forbidden", { status: 403 });

  const formData = await request.formData();
  const payload = Object.fromEntries(formData);
  Object.assign(payload, params);
  const result = schema.safeParse(payload);

  if (!result.success) {
    return json(result.error);
  }

  await prisma.comment.create({
    data: {
      commenter_id: user!.id,
      receiver_id: result.data!.target,
      content: result.data!.content,
      hidden: false,
      flagged: false,
    },
  });

  return redirect(`/profile/${params.id}`);
}

export async function loader({ params }: LoaderFunctionArgs) {
  return redirect(`/profile/${params.id}`);
}
