import { Progress } from "@prisma/client";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { DataTable } from "~/components/ui/url-data-table";
import { prisma } from "~/services/database.server";
import { getUserBySession, getSession } from "~/services/session.server";

import { useAppLoaderData } from "../_app";

import { getColumns } from "./columns";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUserBySession(
    await getSession(request.headers.get("Cookie")),
  );

  const public_domains = await prisma.uRL.findMany({
    where: {
      public: true,
      progress: Progress.DONE,
    },
    select: {
      url: true,
      donator: {
        select: {
          username: true,
        },
      },
    },
  });
  const private_domains = await prisma.uRL.findMany({
    where: {
      donator_id: user!.id,
      progress: Progress.DONE,
      public: false,
    },
    select: {
      url: true,
      donator: {
        select: {
          username: true,
        },
      },
    },
  });

  const data = [...public_domains, ...private_domains];
  return data;
}

export default function DomainSelector() {
  const data = useAppLoaderData();
  const urls = useLoaderData<typeof loader>() as any[];
  const actionData = useActionData<typeof action>();
  const selected = data!.user.upload_preferences!.urls;

  return (
    <Card className="mx-16 my-8">
      <CardHeader>
        <CardTitle>Domains</CardTitle>
      </CardHeader>
      <CardContent>
        <Form method="post">
          <Input
            className="hidden"
            value={"update_urls"}
            name="type"
            readOnly
          />
          <DataTable
            columns={getColumns(
              (data!.user.upload_preferences?.subdomains ?? {}) as Record<
                string,
                string
              >,
            )}
            data={urls}
            selected={selected}
          />
          <Button type="submit">Save</Button>
        </Form>
      </CardContent>
    </Card>
  );
}

const urlUpdateSchema = z.object({
  selected: z.string(),
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const payload = Object.fromEntries(formData);
  let result;

  const requestType = formData.get("type");

  const user = await getUserBySession(
    await getSession(request.headers.get("Cookie")),
  );

  if (requestType === "update_urls") {
    result = urlUpdateSchema.safeParse(payload);
    if (!result.success) {
      const error = result.error.flatten();
      return {
        payload,
        formErrors: error.formErrors,
        fieldErrors: error.fieldErrors,
      };
    }

    const public_domains = await prisma.uRL.findMany({
      where: {
        public: true,
        progress: Progress.DONE,
      },
      select: {
        url: true,
      },
    });
    const private_domains = await prisma.uRL.findMany({
      where: {
        donator_id: user!.id,
        progress: Progress.DONE,
        public: false,
      },
      select: {
        url: true,
      },
    });
    const urls = [...public_domains, ...private_domains];

    const selectedDomains = Object.keys(JSON.parse(result.data.selected));
    let selected = selectedDomains;

    if (selected.length === 0)
      selected = [process.env.BASE_DOMAIN ?? "jays.pics"];

    const subdomains: Record<string, string> = {};
    for (const domain of selectedDomains) {
      const sub = formData.get(`subdomain_${domain}`)?.toString().trim();
      if (sub) subdomains[domain] = sub;
    }

    await prisma.uploaderPreferences.update({
      where: {
        userId: user!.id,
      },
      data: {
        urls: selected,
        subdomains,
      },
    });
  }

  return null;
}
