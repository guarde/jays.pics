import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form } from "@remix-run/react";
import { ImageIcon, Info, Trash2, WandSparkles } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { prisma } from "~/services/database.server";
import { del, uploadToS3 } from "~/services/s3.server";
import { getSession, getUserBySession } from "~/services/session.server";

import { useAppLoaderData } from "./_app";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("userID")) return redirect("/login");
  const user = await getUserBySession(session);
  const formData = await request.formData();
  if (formData.get("remove_overlay")) {
    if (user!.upload_preferences?.effect_overlay) {
      await del(user!.upload_preferences.effect_overlay);
    }
    await prisma.uploaderPreferences.update({
      where: { userId: user!.id },
      data: { effect_overlay: null },
    });
    return redirect("/dashboard/effects");
  }
  const effect = formData.get("effect");
  let overlayKey = user!.upload_preferences?.effect_overlay ?? null;

  const overlay = formData.get("overlay");
  if (overlay && overlay instanceof File && overlay.size > 0) {
    const ext = overlay.type.split("/")[1] ?? "png";
    overlayKey = `effects/${user!.id}/${Date.now()}.${ext}`;
    const res = await uploadToS3(overlay, overlayKey);
    if (!res || res.$metadata.httpStatusCode !== 200) {
      overlayKey = user!.upload_preferences?.effect_overlay ?? null;
    }
  }

  await prisma.uploaderPreferences.update({
    where: { userId: user!.id },
    data: { effect: String(effect), effect_overlay: overlayKey },
  });

  return redirect("/dashboard/effects");
}

const EFFECT_INFO: Record<
  string,
  { label: string; description: string; example: string }
> = {
  none: {
    label: "None",
    description:
      "Images are uploaded exactly as-is with no processing applied.",
    example: "Full colour, no alterations",
  },
  grayscale: {
    label: "Grayscale",
    description:
      "Converts all uploaded images to grayscale, removing colour information while preserving luminance.",
    example: "Black & white conversion",
  },
  sepia: {
    label: "Sepia",
    description:
      "Applies a warm brownish sepia tone to every image, giving it a vintage, aged appearance.",
    example: "Warm vintage tone",
  },
};

export default function Effects() {
  const data = useAppLoaderData();
  const prefs = data?.user.upload_preferences;
  const currentEffect = prefs?.effect ?? "none";
  const effectInfo = EFFECT_INFO[currentEffect] ?? EFFECT_INFO["none"];

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="border-b border-border px-8 py-5">
        <div className="flex items-center gap-2.5">
          <WandSparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Image Effects</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Apply colour effects and overlays to every image you upload
        </p>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form — 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            <Form
              method="post"
              encType="multipart/form-data"
              className="space-y-6"
            >
              {/* Effect selector */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                  <WandSparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Colour Effect</h3>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Choose a filter to apply to every image at upload time. This
                    is applied server-side and cannot be undone after upload.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="effect" className="text-sm font-medium">
                      Effect
                    </Label>
                    <Select name="effect" defaultValue={currentEffect}>
                      <SelectTrigger id="effect" className="max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="grayscale">Grayscale</SelectItem>
                        <SelectItem value="sepia">Sepia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Effect previews */}
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    {Object.entries(EFFECT_INFO).map(([key, info]) => (
                      <div
                        key={key}
                        className={`rounded-lg border p-3 space-y-1.5 transition-colors ${
                          currentEffect === key
                            ? "border-primary/50 bg-primary/5"
                            : "border-border bg-muted/20"
                        }`}
                      >
                        <div
                          className={`h-12 w-full rounded overflow-hidden ${
                            key === "grayscale"
                              ? "bg-gradient-to-br from-gray-300 to-gray-600 grayscale"
                              : key === "sepia"
                                ? "bg-gradient-to-br from-amber-200 to-amber-600 sepia"
                                : "bg-gradient-to-br from-purple-400 to-pink-500"
                          }`}
                        />
                        <p className="text-xs font-medium">{info.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {info.example}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Overlay upload */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Overlay Image</h3>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload a PNG with transparency to composite on top of every
                    image. Great for watermarks, borders, or branding.
                  </p>

                  {prefs?.effect_overlay ? (
                    <div className="rounded-lg border border-border p-4 flex items-start gap-3">
                      <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Overlay active</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {prefs.effect_overlay}
                        </p>
                      </div>
                      <Form method="post">
                        <input type="hidden" name="remove_overlay" value="1" />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </Form>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-6 flex flex-col items-center justify-center text-center gap-2">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        No overlay set
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="overlay" className="text-sm font-medium">
                      Upload overlay
                    </Label>
                    <Input
                      id="overlay"
                      name="overlay"
                      type="file"
                      accept="image/png,image/gif"
                    />
                    <p className="text-xs text-muted-foreground">
                      PNG with transparency recommended. Max 5 MB.
                    </p>
                  </div>
                </div>
              </div>

              <Button type="submit" className="text-white gap-2">
                <WandSparkles className="h-3.5 w-3.5" />
                Save Effects
              </Button>
            </Form>
          </div>

          {/* Info sidebar */}
          <div className="space-y-5">
            {/* Active effect card */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <Info className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Active Effect</h3>
              </div>
              <div className="p-5 space-y-3">
                <div
                  className={`h-24 w-full rounded-lg overflow-hidden ${
                    currentEffect === "grayscale"
                      ? "bg-gradient-to-br from-gray-300 to-gray-600 grayscale"
                      : currentEffect === "sepia"
                        ? "bg-gradient-to-br from-amber-200 to-amber-600 sepia"
                        : "bg-gradient-to-br from-purple-400 to-pink-500"
                  }`}
                />
                <div>
                  <p className="text-sm font-semibold">{effectInfo.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {effectInfo.description}
                  </p>
                </div>
              </div>
            </div>

            {/* How it works */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold">How it works</h3>
              </div>
              <div className="p-5 space-y-3">
                {[
                  {
                    step: "1",
                    text: "You upload an image via ShareX, ShareNix, or the web uploader",
                  },
                  {
                    step: "2",
                    text: "The selected colour effect is applied server-side before storage",
                  },
                  {
                    step: "3",
                    text: "If an overlay is set, it's composited on top of the processed image",
                  },
                  {
                    step: "4",
                    text: "The final image is stored and your link is generated",
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

            {/* Tips */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tips
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span> Effects are applied
                  permanently — original is not stored
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span> Use a transparent PNG
                  overlay for watermarks
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span> Overlay is composited
                  after the colour effect
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span> Changes apply to new
                  uploads only
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
