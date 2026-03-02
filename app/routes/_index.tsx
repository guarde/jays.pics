import { Progress } from "@prisma/client";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link, redirect, useLoaderData } from "@remix-run/react";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Database,
  FileImage,
  Globe,
  Link2,
  MessageSquare,
  Shield,
  Upload,
  User,
  UserPlus,
  Zap,
} from "lucide-react";
import prettyBytes from "pretty-bytes";
import { useState } from "react";
import { FaGithub } from "react-icons/fa";

import { Navbar } from "~/components/navbar";
import { useRootData } from "~/root";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { prisma } from "~/services/database.server";
import { getSession } from "~/services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  if (session.has("userID")) return redirect("/dashboard/index");

  const imageTotal = await prisma.image.count();
  const userTotal = await prisma.user.count();
  const storageTotalBig = (
    await prisma.user.aggregate({
      _sum: {
        space_used: true,
      },
    })
  )._sum.space_used;
  const domainsTotal = await prisma.uRL.count({
    where: {
      progress: Progress.DONE,
    },
  });

  const storageTotal = Number(storageTotalBig ?? 0n);

  return { imageTotal, userTotal, storageTotal, domainsTotal };
}

const FEATURES = [
  {
    icon: Globe,
    title: "Custom Domains",
    description:
      "Bring your own domain or pick from our growing community pool of shared domains.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Images served directly from S3 with aggressive caching for maximum speed.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    icon: Shield,
    title: "Private & Secure",
    description:
      "Your uploads are yours. No tracking, no ads, no selling your data.",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: MessageSquare,
    title: "ShareX & ShareNix",
    description:
      "First-class support for ShareX and ShareNix with one-click config download.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: FileImage,
    title: "Rich Embeds",
    description:
      "Full oEmbed support with customisable titles, authors, and colours for Discord and more.",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
  },
  {
    icon: Link2,
    title: "Invite Only",
    description:
      "Quality over quantity. A referral system keeps the community tight and abuse low.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
];

const STEPS = [
  {
    icon: UserPlus,
    step: "01",
    title: "Get invited",
    description:
      "Request a referral from an existing member or join our Discord. We keep the doors small to keep the service fast.",
  },
  {
    icon: Upload,
    step: "02",
    title: "Upload anything",
    description:
      "Drag & drop in the dashboard, paste from clipboard, or configure ShareX to auto-upload with a hotkey.",
  },
  {
    icon: Clipboard,
    step: "03",
    title: "Share your link",
    description:
      "Copy a short link, use your custom domain, or drop the URL straight into Discord for a rich preview embed.",
  },
];

const FAQ = [
  {
    q: "How do I get an account?",
    a: "The service is invite-only. Ask an existing member for a referral link, or join the Discord to request one.",
  },
  {
    q: "What file types are supported?",
    a: "PNG, JPEG, GIF, WebP, and most other common image formats are fully supported.",
  },
  {
    q: "Is there a file size limit?",
    a: "Each account has a configurable storage quota. There is no single-file size limit beyond that quota.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes — point your domain to the server, add it through the dashboard, and it will be verified and activated automatically.",
  },
  {
    q: "Is it free?",
    a: "The core hosting is free. Premium storage tiers are available for users who need more space.",
  },
  {
    q: "How do I set up ShareX?",
    a: "Head to Upload Settings in your dashboard and click the ShareX button. It downloads a .sxcu file — double-click it to import directly into ShareX.",
  },
  {
    q: "Can I delete my images?",
    a: "Yes. You can delete individual images or bulk-delete from your image library at any time.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-white hover:text-primary transition-colors"
      >
        {q}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">
          {a}
        </p>
      )}
    </div>
  );
}

/** A rough Discord-style embed mock */
function DiscordEmbedMock({ siteName }: { siteName: string }) {
  return (
    <div className="rounded-lg bg-[#313338] p-4 max-w-sm shadow-xl">
      {/* Message row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-primary/80 flex items-center justify-center shrink-0 text-white text-xs font-bold">
          S
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-white">guarde</span>
            <span className="text-[10px] text-[#949ba4]">Today at 14:32</span>
          </div>
          <p className="text-sm text-[#dbdee1] mt-0.5">check this out</p>
        </div>
      </div>
      {/* Embed card */}
      <div className="rounded overflow-hidden border-l-4 border-primary bg-[#2b2d31] ml-12">
        <div className="px-3 py-2.5">
          <p className="text-[11px] text-[#949ba4] mb-0.5">
            Hosted with 🩵 at {siteName}
          </p>
          <p className="text-sm font-semibold text-[#00a8fc] mb-1">
            screenshot_2025.png
          </p>
          <p className="text-xs text-[#dbdee1]">
            Uploaded by <span className="text-primary">guarde</span> · 1.2 MB
          </p>
          {/* Mock image placeholder */}
          <div className="mt-2 rounded bg-[#383a40] h-36 flex items-center justify-center">
            <div className="text-center space-y-1">
              <FileImage className="h-8 w-8 text-[#949ba4] mx-auto" />
              <p className="text-[10px] text-[#949ba4]">image preview</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const { imageTotal, userTotal, storageTotal, domainsTotal } =
    useLoaderData<typeof loader>();
  const rootData = useRootData();
  const siteName = rootData?.siteName ?? "jays.pics";

  return (
    <div className="flex min-h-screen flex-col bg-background dark text-white">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-32 md:py-48 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/20 blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/4 bottom-0 h-[300px] w-[400px] rounded-full bg-secondary/20 blur-[100px]"
        />

        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-medium text-primary mb-6">
            ✦ Invite-only image hosting
          </span>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-none mb-6">
            Share images.{" "}
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Your way.
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            {siteName} is a fast, private image host with custom domains,
            Discord embeds, and first-class ShareX support — no tracking, no
            ads.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register">
              <Button
                size="lg"
                className="group gap-2 text-white w-full sm:w-auto"
              >
                Get Started
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="text-white w-full sm:w-auto"
              >
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────── */}
      <section className="border-y border-border">
        <div className="container mx-auto grid grid-cols-2 md:grid-cols-4">
          {[
            {
              value: imageTotal.toLocaleString(),
              label: "Uploads",
              Icon: FileImage,
            },
            { value: userTotal.toLocaleString(), label: "Users", Icon: User },
            {
              value: prettyBytes(storageTotal ?? 0).replace(" ", ""),
              label: "Stored",
              Icon: Database,
            },
            {
              value: domainsTotal.toLocaleString(),
              label: "Domains",
              Icon: Link2,
            },
          ].map(({ value, label, Icon }, i) => (
            <div
              key={label}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-10 px-4",
                i < 3 && "border-r border-border",
              )}
            >
              <Icon className="h-4 w-4 text-primary mb-1" />
              <span className="text-4xl font-bold font-mono tracking-tight text-primary">
                {value}
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-widest">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="py-24 px-4 border-b border-border">
        <div className="container mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
              How it works
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Up and running in minutes
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector line on desktop */}
            <div
              aria-hidden
              className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-transparent via-border to-transparent"
            />
            {STEPS.map(({ icon: Icon, step, title, description }) => (
              <div
                key={step}
                className="flex flex-col items-center text-center relative"
              >
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center z-10 relative">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-[10px] font-bold text-primary bg-background border border-primary/30 rounded-full w-5 h-5 flex items-center justify-center">
                    {step.slice(1)}
                  </span>
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
              Features
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Everything you need
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, description, color, bg }) => (
              <div
                key={title}
                className="group rounded-xl border border-border bg-card p-6 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
              >
                <div
                  className={cn(
                    "inline-flex items-center justify-center rounded-lg p-2 mb-4",
                    bg,
                  )}
                >
                  <Icon className={cn("h-5 w-5", color)} />
                </div>
                <h3 className="font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DISCORD EMBED SHOWCASE ───────────────────────────────── */}
      <section className="py-24 px-4 border-t border-border">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
                Discord embeds
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-5">
                Images that look great everywhere
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                When you drop a link into Discord, Slack, or anywhere that
                supports oEmbed, your image appears with a rich preview — your
                custom title, author name, and brand colour, all pulled straight
                from your upload preferences.
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {[
                  "Custom embed title using template variables",
                  "Per-user brand colour for the embed sidebar",
                  "Author name with link back to your profile",
                  "Works in Discord, Telegram, Twitter/X, and more",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center lg:justify-end">
              <DiscordEmbedMock siteName={siteName} />
            </div>
          </div>
        </div>
      </section>

      {/* ── SHAREX SPOTLIGHT ─────────────────────────────────────── */}
      <section className="py-24 px-4 border-t border-border bg-card/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Code block */}
            <div className="order-2 lg:order-1">
              <div className="rounded-xl border border-border bg-[#0d0d0d] overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-xs text-muted-foreground font-mono">
                    username.sxcu
                  </span>
                </div>
                <pre className="p-4 text-xs font-mono text-green-400 leading-relaxed overflow-x-auto">
                  {`{
  "Version": "16.1.0",
  "Name": "${siteName}",
  "DestinationType": "ImageUploader",
  "RequestMethod": "POST",
  "RequestURL": "https://${siteName}/upload",
  "Body": "MultipartFormData",
  "FileFormName": "image",
  "URL": "{json:url}"
}`}
                </pre>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
                ShareX integration
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-5">
                One hotkey to upload & copy
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Download your personal{" "}
                <code className="text-primary bg-primary/10 rounded px-1 text-sm">
                  .sxcu
                </code>{" "}
                config from the dashboard. Double-click it to import into
                ShareX, then bind a hotkey — every screenshot you take is
                instantly uploaded and the link is in your clipboard.
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {[
                  "One-click .sxcu download from your dashboard",
                  "Auto-copy link to clipboard on upload",
                  "Works with ShareX, ShareNix, and compatible tools",
                  "Per-user upload key — revoke at any time",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="py-24 px-4 border-t border-border">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
              FAQ
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Common questions
            </h2>
          </div>
          <div className="rounded-xl border border-border bg-card px-6">
            {FAQ.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────── */}
      <section className="py-24 px-4 border-t border-border relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[600px] rounded-full bg-primary/15 blur-[100px]"
        />
        <div className="relative z-10 container mx-auto text-center max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Ready to start sharing?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Join the community and get your images hosted the way they deserve.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register">
              <Button
                size="lg"
                className="group gap-2 text-white w-full sm:w-auto"
              >
                Create an account
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="text-white w-full sm:w-auto"
              >
                Already have an account?
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </span>
          <div className="flex items-center gap-5">
            <Link to="/tos" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link
              to="https://github.com/guarde/jays.pics"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              <FaGithub className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
