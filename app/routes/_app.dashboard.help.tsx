import {
  BookOpen,
  Download,
  ExternalLink,
  Flag,
  HelpCircle,
  MessageSquare,
  Monitor,
  Upload,
} from "lucide-react";

import { useRootData } from "~/root";

const SECTIONS = [
  {
    icon: Upload,
    title: "Uploading Images",
    subsections: [
      {
        label: "On-site upload",
        icon: Monitor,
        steps: [
          "Navigate to the dashboard",
          "Click the Upload button in the top right",
          "Select a file or drag one onto the page",
          "Click Upload to confirm",
        ],
      },
      {
        label: "ShareX / ShareNix",
        icon: Download,
        steps: [
          "Go to Upload Config in the sidebar",
          "Click ShareX or ShareNix to download your config file",
          "Double-click the downloaded file to import it",
          "Bind a hotkey in ShareX — every screenshot auto-uploads and copies the link",
        ],
      },
    ],
  },
  {
    icon: Flag,
    title: "Reporting Content",
    subsections: [
      {
        label: "Reporting an image",
        icon: ExternalLink,
        steps: [
          "Open the image page",
          "Click the Report link below the image",
          "Select a reason and submit",
        ],
      },
      {
        label: "Reporting a comment",
        icon: MessageSquare,
        steps: [
          "Hover over the comment on a profile page",
          "Click the flag icon that appears",
          "Fill out the reason and submit",
        ],
      },
    ],
  },
];

export default function Help() {
  const rootData = useRootData();
  const siteName = rootData?.siteName ?? "jays.pics";

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="border-b border-border px-8 py-5">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Help</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Guides and tips for using {siteName}
        </p>
      </div>

      <div className="p-8 space-y-8 max-w-3xl">
        {SECTIONS.map((section) => (
          <div key={section.title} className="space-y-4">
            <div className="flex items-center gap-2">
              <section.icon className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">{section.title}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {section.subsections.map((sub) => (
                <div
                  key={sub.label}
                  className="rounded-xl border border-border bg-card p-5 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <sub.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">{sub.label}</p>
                  </div>
                  <ol className="space-y-2">
                    {sub.steps.map((step, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-muted-foreground"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Quick links */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Quick links</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                label: "Upload Config",
                href: "/dashboard/upload-config/settings",
                desc: "Download your ShareX / ShareNix config",
              },
              {
                label: "Embed Settings",
                href: "/dashboard/embed",
                desc: "Customise your Discord embed appearance",
              },
              {
                label: "Image Effects",
                href: "/dashboard/effects",
                desc: "Apply effects and overlays at upload time",
              },
              {
                label: "Domain Settings",
                href: "/dashboard/domain-selector",
                desc: "Choose which domains to use for your links",
              },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">
                    {link.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {link.desc}
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary/60 shrink-0 mt-0.5 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
