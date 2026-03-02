import { EyeClosedIcon } from "@radix-ui/react-icons";
import {
  CloudUpload,
  Copy,
  Download,
  Eye,
  Info,
  Shield,
  Wrench,
} from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useToast } from "~/components/toast";

import { useAppLoaderData } from "./_app";

const UPLOADERS = [
  {
    name: "ShareX",
    description:
      "The most popular Windows screenshot & upload tool. Download the .sxcu config and import it in ShareX under Destinations → Custom uploaders.",
    file: ".sxcu",
    platform: "Windows",
    href: (id: string) => `/api/sharex/${id}`,
    steps: [
      "Download the .sxcu config file",
      "Open ShareX → Destinations → Custom uploaders",
      "Click Import and select the downloaded file",
      "Set as active destination for image uploads",
    ],
  },
  {
    name: "ShareNix",
    description:
      "A cross-platform uploader for Linux and macOS inspired by ShareX. Import the .json config via ShareNix's configuration panel.",
    file: ".json",
    platform: "Linux / macOS",
    href: (id: string) => `/api/sharenix/${id}`,
    steps: [
      "Download the .json config file",
      "Open ShareNix → Configuration",
      "Click Import configuration and select the file",
      "Activate as your default uploader",
    ],
  },
];

export default function UploadSettings() {
  const data = useAppLoaderData()!;
  const { showToast } = useToast();
  const [canSeeUploadKey, setCanSeeUploadKey] = useState(false);
  const [expandedUploader, setExpandedUploader] = useState<string | null>(
    "ShareX",
  );

  function copyKey() {
    navigator.clipboard.writeText(data?.user.upload_key ?? "");
    showToast("Upload key copied", "success");
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="border-b border-border px-8 py-5">
        <div className="flex items-center gap-2.5">
          <Wrench className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Upload Config</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your upload key and ready-to-use uploader configuration files
        </p>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content — 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Key */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <CloudUpload className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Upload Key</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <Shield className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Keep this key secret — anyone who has it can upload images
                    to your account. If it's compromised, regenerate it
                    immediately.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Your key</Label>
                  <div className="flex gap-2">
                    <Input
                      type={canSeeUploadKey ? "text" : "password"}
                      readOnly
                      value={data?.user.upload_key ?? ""}
                      className="font-mono text-sm flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setCanSeeUploadKey(!canSeeUploadKey)}
                      title={canSeeUploadKey ? "Hide key" : "Show key"}
                    >
                      {canSeeUploadKey ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeClosedIcon className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyKey}
                      title="Copy key"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Config downloads */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <Download className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Uploader Configs</h3>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Download a pre-configured file for your uploader of choice.
                  Your upload key is embedded automatically — just import and
                  go.
                </p>

                <div className="space-y-3">
                  {UPLOADERS.map((uploader) => (
                    <div
                      key={uploader.name}
                      className="rounded-lg border border-border overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedUploader(
                            expandedUploader === uploader.name
                              ? null
                              : uploader.name,
                          )
                        }
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {uploader.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {uploader.platform}
                            </span>
                          </div>
                        </div>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="gap-1.5 shrink-0"
                        >
                          <a
                            href={uploader.href(data?.user.id ?? "")}
                            download
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="h-3 w-3" />
                            {uploader.file}
                          </a>
                        </Button>
                      </button>

                      {expandedUploader === uploader.name && (
                        <div className="px-4 pb-4 pt-1 border-t border-border space-y-3 bg-muted/10">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {uploader.description}
                          </p>
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium">Setup steps</p>
                            {uploader.steps.map((step, i) => (
                              <div key={i} className="flex gap-2.5 items-start">
                                <span className="h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                  {i + 1}
                                </span>
                                <p className="text-xs text-muted-foreground">
                                  {step}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <Info className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">How uploads work</h3>
              </div>
              <div className="p-5 space-y-3">
                {[
                  {
                    step: "1",
                    text: "Take a screenshot or select a file in your uploader",
                  },
                  {
                    step: "2",
                    text: "The uploader sends the file to our API with your upload key",
                  },
                  {
                    step: "3",
                    text: "Your effects & embed settings are applied",
                  },
                  {
                    step: "4",
                    text: "A shareable link is copied to your clipboard",
                  },
                ].map(({ step, text }) => (
                  <div key={step} className="flex gap-3">
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {step}
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold">API endpoint</h3>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs text-muted-foreground">
                  You can also integrate directly with the API. Send a{" "}
                  <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">
                    POST
                  </code>{" "}
                  multipart request to:
                </p>
                <code className="block px-3 py-2 rounded-lg bg-muted font-mono text-xs break-all">
                  /api/upload
                </code>
                <p className="text-xs text-muted-foreground">
                  Include your upload key as the{" "}
                  <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">
                    key
                  </code>{" "}
                  field and the image file as{" "}
                  <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">
                    file
                  </code>
                  .
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tips
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span> Config files include
                  your upload key — don't share them
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span> Regenerate your key
                  from the settings if compromised
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span> Upload key changes
                  take effect immediately
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
