import { Progress } from "@prisma/client";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link, redirect, useLoaderData } from "@remix-run/react";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Database,
  FileImage,
  Globe,
  Link2,
  MessageSquare,
  Shield,
  User,
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

function HowItWorksSVG() {
  return (
    <svg
      viewBox="0 0 640 180"
      width="640"
      height="180"
      className="w-full max-w-2xl"
      style={{ fontFamily: "inherit" }}
    >
      <defs>
        <style>{`
          @keyframes fadeSlideIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
          @keyframes dash { to { stroke-dashoffset: 0; } }
          @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
          @keyframes uploadRise { from{transform:translateY(0);opacity:1} to{transform:translateY(-22px);opacity:0} }
          @keyframes linkPop { 0%{transform:scale(0.7);opacity:0} 60%{transform:scale(1.1);opacity:1} 100%{transform:scale(1);opacity:1} }
          .step1{animation:fadeSlideIn .5s ease both}
          .step2{animation:fadeSlideIn .5s .8s ease both}
          .step3{animation:fadeSlideIn .5s 1.6s ease both}
          .arrow1{stroke-dasharray:60;stroke-dashoffset:60;animation:dash .5s .5s ease forwards}
          .arrow2{stroke-dasharray:60;stroke-dashoffset:60;animation:dash .5s 1.3s ease forwards}
          .cfg-line{animation:fadeSlideIn .4s .3s ease both}
          .upload-arrow{animation:uploadRise 1s 1.8s ease infinite}
          .link-badge{animation:linkPop .4s 2.4s ease both;opacity:0}
          .sel-box{animation:pulse 1.2s 1.0s ease infinite}
        `}</style>
      </defs>

      {/* ── Step 1: Config download ── */}
      <g className="step1">
        {/* Browser window */}
        <rect
          x="20"
          y="20"
          width="140"
          height="110"
          rx="8"
          fill="#1e1f22"
          stroke="#3f4147"
          strokeWidth="1.5"
        />
        <rect x="20" y="20" width="140" height="22" rx="8" fill="#2b2d31" />
        <rect x="20" y="34" width="140" height="8" fill="#2b2d31" />
        <circle cx="34" cy="31" r="3" fill="#f23f42" opacity=".7" />
        <circle cx="46" cy="31" r="3" fill="#f0b132" opacity=".7" />
        <circle cx="58" cy="31" r="3" fill="#23a559" opacity=".7" />
        {/* File card */}
        <rect
          x="35"
          y="50"
          width="110"
          height="66"
          rx="6"
          fill="#313338"
          stroke="#3f4147"
          strokeWidth="1"
        />
        {/* Config file icon */}
        <rect
          x="48"
          y="58"
          width="28"
          height="34"
          rx="3"
          fill="#e05cd9"
          opacity=".2"
          stroke="#e05cd9"
          strokeWidth="1"
        />
        <line
          x1="53"
          y1="66"
          x2="70"
          y2="66"
          stroke="#e05cd9"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity=".7"
        />
        <line
          x1="53"
          y1="71"
          x2="70"
          y2="71"
          stroke="#e05cd9"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity=".7"
        />
        <line
          x1="53"
          y1="76"
          x2="64"
          y2="76"
          stroke="#e05cd9"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity=".5"
        />
        <text x="83" y="68" fontSize="7.5" fill="#dbdee1" fontWeight="600">
          .sxcu
        </text>
        <text x="83" y="78" fontSize="6.5" fill="#80848e">
          config
        </text>
        {/* Download arrow */}
        <g className="cfg-line">
          <line
            x1="90"
            y1="88"
            x2="90"
            y2="102"
            stroke="#e05cd9"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <polyline
            points="86,98 90,104 94,98"
            fill="none"
            stroke="#e05cd9"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>
        <text
          x="90"
          y="130"
          fontSize="9"
          fill="#e05cd9"
          textAnchor="middle"
          fontWeight="600"
        >
          Download config
        </text>
      </g>

      {/* ── Arrow 1 ── */}
      <line
        className="arrow1"
        x1="168"
        y1="75"
        x2="218"
        y2="75"
        stroke="#e05cd9"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity=".6"
      />
      <polyline
        className="arrow1"
        points="212,70 220,75 212,80"
        fill="none"
        stroke="#e05cd9"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity=".6"
      />

      {/* ── Step 2: Screenshot ── */}
      <g className="step2">
        {/* Desktop screen */}
        <rect
          x="230"
          y="20"
          width="180"
          height="120"
          rx="8"
          fill="#1e1f22"
          stroke="#3f4147"
          strokeWidth="1.5"
        />
        <rect x="230" y="20" width="180" height="22" rx="8" fill="#2b2d31" />
        <rect x="230" y="34" width="180" height="8" fill="#2b2d31" />
        <circle cx="244" cy="31" r="3" fill="#f23f42" opacity=".7" />
        <circle cx="256" cy="31" r="3" fill="#f0b132" opacity=".7" />
        <circle cx="268" cy="31" r="3" fill="#23a559" opacity=".7" />
        {/* Screen content (fake app) */}
        <rect x="242" y="48" width="80" height="10" rx="3" fill="#313338" />
        <rect
          x="242"
          y="62"
          width="60"
          height="6"
          rx="2"
          fill="#313338"
          opacity=".7"
        />
        <rect
          x="242"
          y="72"
          width="70"
          height="6"
          rx="2"
          fill="#313338"
          opacity=".5"
        />
        <rect
          x="242"
          y="84"
          width="50"
          height="40"
          rx="4"
          fill="#313338"
          opacity=".8"
        />
        <rect
          x="298"
          y="84"
          width="90"
          height="40"
          rx="4"
          fill="#313338"
          opacity=".6"
        />
        {/* Selection box */}
        <rect
          className="sel-box"
          x="256"
          y="80"
          width="120"
          height="52"
          rx="3"
          fill="none"
          stroke="#e05cd9"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
        {/* Corner handles */}
        <rect
          x="253.5"
          y="77.5"
          width="5"
          height="5"
          rx="1"
          fill="#e05cd9"
          opacity=".8"
        />
        <rect
          x="373.5"
          y="77.5"
          width="5"
          height="5"
          rx="1"
          fill="#e05cd9"
          opacity=".8"
        />
        <rect
          x="253.5"
          y="129.5"
          width="5"
          height="5"
          rx="1"
          fill="#e05cd9"
          opacity=".8"
        />
        <rect
          x="373.5"
          y="129.5"
          width="5"
          height="5"
          rx="1"
          fill="#e05cd9"
          opacity=".8"
        />
        <text
          x="320"
          y="155"
          fontSize="9"
          fill="#e05cd9"
          textAnchor="middle"
          fontWeight="600"
        >
          Screenshot region
        </text>
      </g>

      {/* ── Arrow 2 ── */}
      <line
        className="arrow2"
        x1="418"
        y1="75"
        x2="468"
        y2="75"
        stroke="#e05cd9"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity=".6"
      />
      <polyline
        className="arrow2"
        points="462,70 470,75 462,80"
        fill="none"
        stroke="#e05cd9"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity=".6"
      />

      {/* ── Step 3: Upload & link ── */}
      <g className="step3">
        {/* Cloud upload icon */}
        <ellipse
          cx="552"
          cy="65"
          rx="32"
          ry="22"
          fill="#1e1f22"
          stroke="#3f4147"
          strokeWidth="1.5"
        />
        <ellipse
          cx="534"
          cy="72"
          rx="16"
          ry="14"
          fill="#1e1f22"
          stroke="#3f4147"
          strokeWidth="1.5"
        />
        <ellipse
          cx="572"
          cy="74"
          rx="14"
          ry="12"
          fill="#1e1f22"
          stroke="#3f4147"
          strokeWidth="1.5"
        />
        <rect x="535" y="65" width="32" height="22" fill="#1e1f22" />
        {/* Upload arrow (animated) */}
        <g className="upload-arrow">
          <line
            x1="551"
            y1="72"
            x2="551"
            y2="56"
            stroke="#e05cd9"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <polyline
            points="546,62 551,54 556,62"
            fill="none"
            stroke="#e05cd9"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>
        {/* Link badge */}
        <g className="link-badge">
          <rect
            x="510"
            y="98"
            width="82"
            height="22"
            rx="11"
            fill="#e05cd9"
            opacity=".15"
            stroke="#e05cd9"
            strokeWidth="1"
          />
          <text
            x="551"
            y="113"
            fontSize="8"
            fill="#e05cd9"
            textAnchor="middle"
            fontWeight="700"
          >
            Link copied ✓
          </text>
        </g>
        <text
          x="551"
          y="148"
          fontSize="9"
          fill="#e05cd9"
          textAnchor="middle"
          fontWeight="600"
        >
          Auto-upload &amp; copy link
        </text>
      </g>
    </svg>
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
      <section className="relative flex flex-col items-center justify-center overflow-hidden py-32 md:py-48 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/20 blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/4 bottom-0 h-[300px] w-[400px] rounded-full bg-secondary/20 blur-[100px]"
        />

        <div className="container mx-auto px-4 relative z-10 max-w-3xl">
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
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4">
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
      <section className="py-24 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
              How it works
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Up and running in minutes
            </h2>
          </div>

          {/* Animated SVG diagram */}
          <div className="flex justify-center mb-16">
            <HowItWorksSVG />
          </div>

          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div
              aria-hidden
              className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-transparent via-border to-transparent"
            />
            {STEPS.map(({ icon: Icon, step, title, description }) => (
              <div key={step} className="flex flex-col items-center text-center relative">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center z-10 relative">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-[10px] font-bold text-primary bg-background border border-primary/30 rounded-full w-5 h-5 flex items-center justify-center">
                    {step.slice(1)}
                  </span>
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{description}</p>
              </div>
            ))}
          </div> */}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="container mx-auto px-4">
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
      <section className="py-24 border-t border-border">
        <div className="container mx-auto px-4">
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
      <section className="py-24 border-t border-border bg-card/30">
        <div className="container mx-auto px-4">
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
      <section className="py-24 border-t border-border">
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
      <section className="py-24 border-t border-border relative overflow-hidden">
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
