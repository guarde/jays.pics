import { Progress } from "@prisma/client";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { Check, Globe, Info, Plus, Shuffle } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { useToast } from "~/components/toast";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { prisma } from "~/services/database.server";
import { getUserBySession, getSession } from "~/services/session.server";

import { useAppLoaderData } from "../_app";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUserBySession(
    await getSession(request.headers.get("Cookie")),
  );

  const public_domains = await prisma.uRL.findMany({
    where: { public: true, progress: Progress.DONE },
    select: { url: true, donator: { select: { username: true } } },
  });
  const private_domains = await prisma.uRL.findMany({
    where: { donator_id: user!.id, progress: Progress.DONE, public: false },
    select: { url: true, donator: { select: { username: true } } },
  });

  return [...public_domains, ...private_domains];
}

const urlUpdateSchema = z.object({ selected: z.string() });

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const payload = Object.fromEntries(formData);
  const requestType = formData.get("type");

  const user = await getUserBySession(
    await getSession(request.headers.get("Cookie")),
  );

  if (requestType === "update_urls") {
    const result = urlUpdateSchema.safeParse(payload);
    if (!result.success) return null;

    const public_domains = await prisma.uRL.findMany({
      where: { public: true, progress: Progress.DONE },
      select: { url: true },
    });
    const private_domains = await prisma.uRL.findMany({
      where: { donator_id: user!.id, progress: Progress.DONE, public: false },
      select: { url: true },
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
      where: { userId: user!.id },
      data: { urls: selected, subdomains },
    });
  }

  return null;
}

export default function DomainSelector() {
  const appData = useAppLoaderData();
  const urls = useLoaderData<typeof loader>();
  const { showToast } = useToast();

  const currentSelected: string[] =
    appData!.user.upload_preferences?.urls ?? [];
  const currentSubdomains = (appData!.user.upload_preferences?.subdomains ??
    {}) as Record<string, string>;

  const [selected, setSelected] = useState<Set<string>>(
    new Set(currentSelected),
  );
  const [subdomains, setSubdomains] =
    useState<Record<string, string>>(currentSubdomains);

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  const selectedJSON = JSON.stringify(
    Object.fromEntries([...selected].map((d) => [d, true])),
  );

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="border-b border-border px-8 py-5">
        <div className="flex items-center gap-2.5">
          <Globe className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Domain Selector</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choose which domains your image links use. Multiple domains are picked
          at random per upload.
        </p>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Domain list — 2 cols */}
          <div className="lg:col-span-2">
            <Form
              method="post"
              onSubmit={() => showToast("Domain preferences saved", "success")}
              className="space-y-5"
            >
              <input type="hidden" name="type" value="update_urls" />
              <input
                type="hidden"
                name="selected"
                value={selectedJSON}
                readOnly
              />

              {urls.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border flex flex-col items-center justify-center py-16 text-center gap-3">
                  <Globe className="h-10 w-10 text-muted-foreground/20" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      No domains available
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Add your own domain or wait for a public one to become
                      available
                    </p>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="gap-1.5 mt-1"
                  >
                    <Link to="/dashboard/domain/add">
                      <Plus className="h-3.5 w-3.5" />
                      Add a domain
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {urls.map((item) => {
                    const isSelected = selected.has(item.url);
                    return (
                      <div
                        key={item.url}
                        onClick={() => toggle(item.url)}
                        className={cn(
                          "rounded-xl border bg-card p-4 cursor-pointer transition-all duration-150 select-none",
                          isSelected
                            ? "border-primary/50 bg-primary/5"
                            : "border-border hover:border-primary/20 hover:bg-accent/30",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {/* Checkbox indicator */}
                          <div
                            className={cn(
                              "h-4 w-4 rounded border shrink-0 flex items-center justify-center transition-colors",
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-muted-foreground/40",
                            )}
                          >
                            {isSelected && (
                              <Check className="h-2.5 w-2.5 text-white" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-mono font-medium">
                              {item.url}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              by {item.donator?.username ?? "unknown"}
                            </p>
                          </div>

                          {isSelected && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              active
                            </span>
                          )}
                        </div>

                        {/* Subdomain input — shown when selected */}
                        {isSelected && (
                          <div
                            className="mt-3 pt-3 border-t border-border/60"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p className="text-xs text-muted-foreground mb-1.5">
                              Subdomain{" "}
                              <span className="text-muted-foreground/60">
                                (optional)
                              </span>
                            </p>
                            <div className="flex items-center gap-2">
                              <Input
                                name={`subdomain_${item.url}`}
                                value={subdomains[item.url] ?? ""}
                                onChange={(e) =>
                                  setSubdomains((prev) => ({
                                    ...prev,
                                    [item.url]: e.target.value,
                                  }))
                                }
                                placeholder="e.g. i"
                                className="h-8 text-sm font-mono w-36"
                              />
                              <span className="text-xs text-muted-foreground">
                                .{item.url}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button type="submit" className="text-white gap-2">
                  <Check className="h-3.5 w-3.5" />
                  Save preferences
                </Button>
                {selected.size > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selected.size} domain{selected.size !== 1 ? "s" : ""}{" "}
                    selected
                  </p>
                )}
              </div>
            </Form>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <Info className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">How it works</h3>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When you upload an image, one of your selected domains is
                  chosen at random to generate the shareable link.
                </p>
                {[
                  {
                    icon: <Globe className="h-3.5 w-3.5" />,
                    text: "Select one or more domains below",
                  },
                  {
                    icon: <Shuffle className="h-3.5 w-3.5" />,
                    text: "A domain is picked randomly per upload",
                  },
                  {
                    icon: <Check className="h-3.5 w-3.5" />,
                    text: "Your link uses the selected domain",
                  },
                ].map(({ icon, text }, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="text-primary">{icon}</span>
                    <p className="text-xs text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold">Subdomains</h3>
              </div>
              <div className="p-5 space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Optionally set a subdomain for each domain. For example,
                  setting{" "}
                  <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">
                    i
                  </code>{" "}
                  on{" "}
                  <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">
                    example.com
                  </code>{" "}
                  will generate links like:
                </p>
                <code className="block px-3 py-2 rounded-lg bg-muted font-mono text-xs">
                  i.example.com/abc123
                </code>
                <p className="text-xs text-muted-foreground">
                  Leave blank to use the root domain.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Your own domain?
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You can link your own domain and use it exclusively for your
                uploads.
              </p>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-1.5 w-full mt-2"
              >
                <Link to="/dashboard/domain/add">
                  <Plus className="h-3.5 w-3.5" />
                  Add a domain
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
