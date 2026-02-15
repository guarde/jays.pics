import { Label } from "@radix-ui/react-label";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { CloudflareError } from "cloudflare";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { LogType } from "~/lib/enums/logtype";
import { Progress } from "~/lib/enums/progress";
import { createZone } from "~/services/cloudflare.server";
import { prisma } from "~/services/database.server";
import { getSession, getUserBySession } from "~/services/session.server";

const domainSchema = z.object({
  domain: z
    .string()
    .regex(/[a-z-]+\.[a-z]+/i, "This domain is invalid.")
    .optional(),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const paramEntries = Object.fromEntries(url.searchParams.entries());
  const result = domainSchema.safeParse(paramEntries);

  if (!result.success) {
    const error = result.error.flatten();
    return {
      paramEntries,
      formErrors: error.formErrors,
      fieldErrors: error.fieldErrors,
    };
  }

  let domain = null;
  if (result.data.domain) {
    domain = await prisma.uRL.findFirst({
      where: {
        url: result.data.domain,
      },
    });
  }

  return domain;
}

export default function AddDomain() {
  const data = useLoaderData<typeof loader>() as any;
  const actionData = useActionData<typeof action>();

  if (data === null) {
    // This domain doesn't exist in our database
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>What domain would you like to link?</CardHeader>
          <CardContent>
            <Form method="POST">
              <Input
                name="action"
                value="set_domain"
                readOnly
                className="hidden"
              />
              <Input name="domain" placeholder="domain.com" />
              <Button className="mt-2 w-full">Start</Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  switch (data.progress) {
    case Progress.INPUT:
      return (
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>What domain would you like to link?</CardTitle>
            </CardHeader>
            <CardContent>
              <Input name="domain" defaultValue={data.url} readOnly />
              <Button className="mt-2 w-full" disabled>
                Start
              </Button>
            </CardContent>
          </Card>
          <Card className="mt-2">
            <CardHeader>
              <CardTitle>Change Nameservers</CardTitle>
            </CardHeader>
            <CardContent>
              <Label>Please update your nameservers to point too</Label>
              <Input
                className="mt-2"
                readOnly
                defaultValue={data!.nameservers[0]}
              />
              <Input
                className="mt-2"
                readOnly
                defaultValue={data!.nameservers[1]}
              />
              <Form method="POST">
                <Input
                  name="domain"
                  defaultValue={data!.url}
                  readOnly
                  className="hidden"
                />
                <Input
                  name="action"
                  value="updated_nameservers"
                  readOnly
                  className="hidden"
                />
                <Button className="mt-2 w-full">Done</Button>
              </Form>
            </CardContent>
          </Card>
        </div>
      );
    case Progress.WAITING:
      return (
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>What domain would you like to link?</CardTitle>
            </CardHeader>
            <CardContent>
              <Input name="domain" defaultValue={data.url} readOnly />
              <Button className="mt-2 w-full" disabled>
                Start
              </Button>
            </CardContent>
          </Card>
          <Card className="mt-2">
            <CardHeader>
              <CardTitle>Change Nameservers</CardTitle>
            </CardHeader>
            <CardContent>
              <Label>Please update your nameservers to point too</Label>
              <Input
                className="mt-2"
                readOnly
                defaultValue={data!.nameservers[0]}
              />
              <Input
                className="mt-2"
                readOnly
                defaultValue={data!.nameservers[1]}
              />
              <Input
                name="action"
                value="updated_nameservers"
                readOnly
                className="hidden"
                disabled
              />
              <Button className="mt-2 w-full" disabled>
                Done
              </Button>
            </CardContent>
          </Card>
          <Card className="mt-2">
            <CardHeader>
              <CardTitle>Waiting</CardTitle>
            </CardHeader>
            <CardContent>
              <Label>
                We are checking the nameservers of {data.url}. Please check back
                again later.
              </Label>
            </CardContent>
          </Card>
        </div>
      );
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const payload = Object.fromEntries(formData);
  const result = domainSchema.safeParse(payload);

  if (!result.success) {
    const error = result.error.flatten();
    return {
      payload,
      formErrors: error.formErrors,
      fieldErrors: error.fieldErrors,
    };
  }

  const requestAction = formData.get("action");

  const user = await getUserBySession(
    await getSession(request.headers.get("Cookie")),
  );

  if (requestAction === "set_domain") {
    // assume the worst
    const domainCheck = await prisma.uRL.count({
      where: { url: result.data?.domain },
    });
    if (domainCheck !== 0) return null;

    // assume the domain is brand new

    try {
      const zone = await createZone(result.data.domain!);

      if (!zone) throw new Error("failed to create zone");

      const domain = await prisma.uRL.create({
        data: {
          donator_id: user!.id,
          url: result.data.domain!,
          public: false,
          zone_id: zone.id,
          nameservers: zone.name_servers,
        },
      });

      return redirect("/dashboard/domain/add?domain=" + domain.url);
    } catch (err: any) {
      if (err instanceof CloudflareError) {
        const e = JSON.parse(err.message.slice(4, err.message.length));
        if (!e.errors[0].message.includes("already exists")) {
          await prisma.log.create({
            data: {
              message: e.errors[0].message,
              type: LogType.ERROR,
            },
          });
        }
      }
    }
  }

  if (requestAction === "updated_nameservers") {
    await prisma.uRL.update({
      where: {
        url: result.data.domain,
      },
      data: {
        progress: Progress.WAITING,
      },
    });
    return redirect("/dashboard/domain/add?domain=" + result.data.domain);
  }
  return null;
}
