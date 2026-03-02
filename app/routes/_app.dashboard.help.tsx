import {
  BookOpen,
  ChevronRight,
  Download,
  ExternalLink,
  Flag,
  HelpCircle,
  Key,
  MessageSquare,
  Monitor,
  Settings,
  Upload,
} from "lucide-react";

import { useRootData } from "~/root";

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

      <div className="p-8 space-y-10">
        {/* On-site upload */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Uploading Images</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-medium">On-site upload</p>
              </div>
              <ol className="space-y-2">
                {[
                  "Navigate to the dashboard",
                  "Click the Upload button in the sidebar",
                  "Select a file or drag one onto the page",
                  "Click Upload to confirm",
                ].map((step, i) => (
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

            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-medium">ShareNix (Linux / macOS)</p>
              </div>
              <ol className="space-y-2">
                {[
                  "Go to Upload Config in the sidebar",
                  'Click "ShareNix" to download your config',
                  "Follow the ShareNix installation guide to bind a hotkey",
                  "Every screenshot auto-uploads and copies the link",
                ].map((step, i) => (
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
          </div>
        </section>

        {/* ShareX detailed guide */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">
              Setting up ShareX (Windows)
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Quick start */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <p className="text-sm font-semibold">Quick start</p>
              <ol className="space-y-2.5">
                {[
                  "Download and install ShareX from getsharex.com",
                  "Go to Upload Config → ShareX in the sidebar",
                  "Click Download to get your personalised config file",
                  "Double-click the .sxcu file — ShareX imports it automatically",
                  "Open ShareX → Destinations → Image uploader and confirm it's set to your site",
                  "Bind a hotkey in ShareX (e.g. Print Screen) to capture & upload",
                ].map((step, i) => (
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

            {/* Manual setup */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <p className="text-sm font-semibold">Manual config setup</p>
              <p className="text-xs text-muted-foreground">
                If you prefer to configure ShareX by hand rather than importing
                the config file:
              </p>
              <ol className="space-y-2.5">
                {[
                  "Open ShareX → Destinations → Custom uploader settings",
                  "Click New and name it anything you like",
                  "Set Method to POST and enter your upload URL",
                  "Set Body to Form data (multipart/form-data)",
                  'Add a file field named "file"',
                  "Add an Authorization header with your upload key",
                  'Set the URL to parse the "url" field from the JSON response',
                  "Click Test to verify, then set as active destination",
                ].map((step, i) => (
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

            {/* Upload key */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-primary" />
                  <p className="text-sm font-semibold">Your upload key</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your upload key authenticates requests to the upload API. It's
                  included automatically when you download the config file.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If you ever need to find it manually, go to{" "}
                  <span className="font-medium text-foreground">
                    Upload Config → Config
                  </span>{" "}
                  in the sidebar.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2">
                  <span className="font-medium">Keep your key private.</span>
                  <span className="text-amber-400/80">
                    Anyone with it can upload to your account.
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <p className="text-sm font-semibold">Tips</p>
                <ul className="space-y-2">
                  {[
                    "Use the Domain Selector to randomise which domain your links use",
                    "Set a custom embed title and colour in Embed Settings",
                    "Apply image effects (grayscale, sepia…) at upload time via Effects",
                  ].map((tip, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Reporting */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Reporting Content</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-medium">Reporting an image</p>
              </div>
              <ol className="space-y-2">
                {[
                  "Open the image page",
                  "Click the Report button in the info panel",
                  "Select a reason and submit",
                ].map((step, i) => (
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
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-medium">Reporting a comment</p>
              </div>
              <ol className="space-y-2">
                {[
                  "Hover over the comment on a profile page",
                  "Click the flag icon that appears",
                  "Fill out the reason and submit",
                ].map((step, i) => (
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
          </div>
        </section>

        {/* Quick links */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Quick links</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
        </section>
      </div>
    </main>
  );
}
