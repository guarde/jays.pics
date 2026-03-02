import { Label } from "@radix-ui/react-label";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { CloudflareError } from "cloudflare";
import {
  CheckCircle2,
  Circle,
  Clock,
  Globe,
  Info,
  RefreshCw,
  Shield,
} from "lucide-react";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
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
    domain = await prisma.uRL.findFirst({ where: { url: result.data.domain } });
  }

  return domain;
}

// ─── Shared sidebar shown on every step ───────────────────────────────────────
function Sidebar() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Info className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Why add a domain?</h3>
        </div>
        <div className="p-5 space-y-3">
          {[
            {
              title: "Your branding",
              desc: "Share images with your own domain instead of ours",
            },
            {
              title: "Private hosting",
              desc: "Your domain can be set to private — only you can use it",
            },
            {
              title: "Multiple domains",
              desc: "Add several and we'll randomise which one is used per upload",
            },
          ].map(({ title, desc }) => (
            <div key={title} className="flex gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">Requirements</h3>
        </div>
        <div className="p-5">
          <ul className="space-y-2 text-xs text-muted-foreground">
            {[
              "You must own the domain and be able to change nameservers",
              "We handle DNS configuration automatically via Cloudflare",
              "The domain cannot already be in use by another account",
              "Propagation can take up to 48 hours",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="text-primary mt-0.5">•</span> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Security</h3>
        </div>
        <div className="p-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your domain is proxied through Cloudflare, giving you DDoS
            protection, automatic SSL, and fast global delivery at no extra
            cost.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepBar({ active }: { active: 0 | 1 | 2 }) {
  const steps = ["Enter domain", "Update nameservers", "Verification"];
  return (
    <div className="flex items-center gap-3 mb-6">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {i < active ? (
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            ) : i === active ? (
              <div className="h-4 w-4 rounded-full border-2 border-primary shrink-0 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />
            )}
            <span
              className={cn(
                "text-sm",
                i === active
                  ? "font-medium text-foreground"
                  : i < active
                    ? "text-muted-foreground"
                    : "text-muted-foreground/40",
              )}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-px w-8",
                i < active ? "bg-primary/40" : "bg-border",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function AddDomain() {
  const data = useLoaderData<typeof loader>() as any;
  const actionData = useActionData<{
    serverError?: string;
    fieldErrors?: { domain?: string[] };
  }>();

  // ── Step 0: no domain submitted yet ────────────────────────────────────────
  if (data === null) {
    return (
      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border px-8 py-5">
          <div className="flex items-center gap-2.5">
            <Globe className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Add Domain</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Link your own domain to use it for image hosting
          </p>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <StepBar active={0} />
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                  <Globe className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Enter your domain</h3>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Enter the domain you'd like to use. You must own it and be
                    able to update its nameservers.
                  </p>
                  <Form method="post" className="space-y-3">
                    <input type="hidden" name="action" value="set_domain" />
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Domain name</Label>
                      <Input
                        name="domain"
                        placeholder="example.com"
                        className="font-mono max-w-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter just the bare domain — no http:// or www.
                      </p>
                      {actionData?.fieldErrors?.domain && (
                        <p className="text-xs text-destructive">
                          {actionData.fieldErrors.domain[0]}
                        </p>
                      )}
                      {actionData?.serverError && (
                        <p className="text-xs text-destructive">
                          {actionData.serverError}
                        </p>
                      )}
                    </div>
                    <Button type="submit" className="text-white">
                      Continue
                    </Button>
                  </Form>
                </div>
              </div>
            </div>
            <Sidebar />
          </div>
        </div>
      </main>
    );
  }

  // ── Step 1: domain submitted, nameservers shown ─────────────────────────────
  if (data.progress === Progress.INPUT) {
    return (
      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border px-8 py-5">
          <div className="flex items-center gap-2.5">
            <Globe className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Add Domain</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Link your own domain to use it for image hosting
          </p>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-5">
              <StepBar active={1} />

              {/* Domain confirmed */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Domain submitted</h3>
                </div>
                <div className="p-5">
                  <p className="text-sm font-mono text-foreground">
                    {data.url}
                  </p>
                </div>
              </div>

              {/* Nameservers */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">
                    Update your nameservers
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Log in to your domain registrar and replace your current
                    nameservers with:
                  </p>
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Nameserver 1
                      </Label>
                      <Input
                        readOnly
                        defaultValue={data.nameservers[0]}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Nameserver 2
                      </Label>
                      <Input
                        readOnly
                        defaultValue={data.nameservers[1]}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                    <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Nameserver changes can take up to 48 hours to propagate
                      globally.
                    </p>
                  </div>
                  <Form method="post">
                    <input type="hidden" name="domain" value={data.url} />
                    <input
                      type="hidden"
                      name="action"
                      value="updated_nameservers"
                    />
                    <Button type="submit" className="text-white">
                      Done — I've updated my nameservers
                    </Button>
                  </Form>
                </div>
              </div>
            </div>
            <Sidebar />
          </div>
        </div>
      </main>
    );
  }

  // ── Step 2: waiting for propagation ────────────────────────────────────────
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="border-b border-border px-8 py-5">
        <div className="flex items-center gap-2.5">
          <Globe className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Add Domain</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Link your own domain to use it for image hosting
        </p>
      </div>
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            <StepBar active={2} />

            {/* Domain confirmed */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Domain submitted</h3>
              </div>
              <div className="p-5">
                <p className="text-sm font-mono text-foreground">{data.url}</p>
              </div>
            </div>

            {/* Nameservers — read-only reminder */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Nameservers updated
                </h3>
              </div>
              <div className="p-5 space-y-2">
                <Input
                  readOnly
                  defaultValue={data.nameservers[0]}
                  className="font-mono text-sm"
                />
                <Input
                  readOnly
                  defaultValue={data.nameservers[1]}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            {/* Waiting */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <Clock className="h-4 w-4 text-primary animate-pulse" />
                <h3 className="text-sm font-semibold">Verifying…</h3>
              </div>
              <div className="p-5 space-y-2">
                <p className="text-sm text-muted-foreground">
                  We're periodically checking the nameservers for{" "}
                  <span className="font-mono text-foreground">{data.url}</span>.
                  This can take up to 24–48 hours depending on your registrar.
                </p>
                <p className="text-sm text-muted-foreground">
                  You don't need to do anything — we'll activate your domain
                  automatically once propagation completes.
                </p>
              </div>
            </div>
          </div>
          <Sidebar />
        </div>
      </div>
    </main>
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const payload = Object.fromEntries(formData);
  const result = domainSchema.safeParse(payload);

  if (!result.success) {
    const error = result.error.flatten();
    return { fieldErrors: error.fieldErrors };
  }

  const requestAction = formData.get("action");
  const user = await getUserBySession(
    await getSession(request.headers.get("Cookie")),
  );

  if (requestAction === "set_domain") {
    const domainCheck = await prisma.uRL.count({
      where: { url: result.data?.domain },
    });
    if (domainCheck !== 0)
      return { serverError: "This domain is already registered." };

    try {
      const zone = await createZone(result.data.domain!);
      if (!zone) throw new Error("Failed to create Cloudflare zone.");

      const domain = await prisma.uRL.create({
        data: {
          donator_id: user!.id,
          url: result.data.domain!,
          public: false,
          zone_id: zone.id,
          nameservers: zone.name_servers ?? [],
        },
      });

      return redirect("/dashboard/domain/add?domain=" + domain.url);
    } catch (err: any) {
      if (err instanceof CloudflareError) {
        try {
          const e = JSON.parse(err.message.slice(4));
          const msg: string = e.errors?.[0]?.message ?? "Cloudflare error";
          if (!msg.includes("already exists")) {
            await prisma.log.create({
              data: { message: msg, type: LogType.ERROR },
            });
          }
          return { serverError: msg };
        } catch {
          return {
            serverError: "A Cloudflare error occurred. Please try again.",
          };
        }
      }
      return {
        serverError:
          err.message ?? "Failed to register domain. Please try again.",
      };
    }
  }

  if (requestAction === "updated_nameservers") {
    await prisma.uRL.update({
      where: { url: result.data.domain },
      data: { progress: Progress.WAITING },
    });
    return redirect("/dashboard/domain/add?domain=" + result.data.domain);
  }

  return null;
}
