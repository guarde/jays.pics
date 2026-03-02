import { ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { Hash, Palette, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { useToast } from "~/components/toast";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { prisma } from "~/services/database.server";
import { getSession, getUserBySession } from "~/services/session.server";
import { useRootData } from "~/root";

import { useAppLoaderData } from "../_app";

const embedUpdateSchema = z.object({
  embed_title: z.string(),
  embed_author: z.string(),
  embed_colour: z
    .string()
    .length(7, { message: "Must be 7 characters long" })
    .regex(/^#/, { message: "Must be a valid hex colour" }),
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("userID")) return redirect("/login");

  const user = await getUserBySession(session);
  const formData = await request.formData();
  const payload = Object.fromEntries(formData);
  const result = embedUpdateSchema.safeParse(payload);

  if (!result.success) {
    const error = result.error.flatten();
    console.log(error);
    return json({ ok: false, fieldErrors: error.fieldErrors }, { status: 400 });
  }

  await prisma.uploaderPreferences.update({
    where: { userId: user!.id },
    data: {
      embed_author: result.data.embed_author,
      embed_title: result.data.embed_title,
      embed_colour: result.data.embed_colour,
      domain_hack: false,
    },
  });

  const accept = request.headers.get("Accept") || "";
  if (accept.includes("application/json")) return json({ ok: true });
  return redirect("/dashboard/embed");
}

const TEMPLATE_VARS: { key: string; label: string; example: string }[] = [
  { key: "image.name", label: "Image name", example: "screenshot.png" },
  { key: "image.size", label: "Image size", example: "120 KB" },
  { key: "image.created_at", label: "Upload date", example: "2025-01-01" },
  { key: "uploader.name", label: "Your username", example: "guarde" },
  { key: "uploader.storage_used", label: "Storage used", example: "200 KB" },
  { key: "uploader.total_storage", label: "Total storage", example: "1 MB" },
];

function insertAtCursor(
  inputRef: React.RefObject<HTMLInputElement>,
  variable: string,
  value: string,
  setValue: (v: string) => void,
) {
  const input = inputRef.current;
  if (!input) return;
  const start = input.selectionStart ?? value.length;
  const end = input.selectionEnd ?? value.length;
  const tag = `{{${variable}}}`;
  const newValue = value.slice(0, start) + tag + value.slice(end);
  setValue(newValue);
  requestAnimationFrame(() => {
    input.focus();
    input.setSelectionRange(start + tag.length, start + tag.length);
  });
}

export default function Embed() {
  const data = useAppLoaderData();
  const rootData = useRootData();
  const siteName = rootData?.siteName ?? "jays.pics";
  const fetcher = useFetcher();
  const { showToast } = useToast();

  const [title, setTitle] = useState(
    data!.user.upload_preferences?.embed_title ?? "",
  );
  const [author, setAuthor] = useState(
    data!.user.upload_preferences?.embed_author ?? "",
  );
  const [colour, setColour] = useState(
    data!.user.upload_preferences?.embed_colour ?? "#e05cd9",
  );
  const [focusedField, setFocusedField] = useState<"title" | "author">("title");

  const titleRef = useRef<HTMLInputElement>(null);
  const authorRef = useRef<HTMLInputElement>(null);

  function applyTemplates(text: string): string {
    return text.replace(
      /{{(.*?)}}/g,
      (_, key) =>
        TEMPLATE_VARS.find((v) => v.key === key.trim())?.example ??
        `{{${key}}}`,
    );
  }

  function handleInsert(variable: string) {
    if (focusedField === "title") {
      insertAtCursor(titleRef, variable, title, setTitle);
    } else {
      insertAtCursor(authorRef, variable, author, setAuthor);
    }
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="border-b border-border px-8 py-5">
        <div className="flex items-center gap-2.5">
          <Palette className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Embed Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Customise how your images appear when shared on Discord and other
          platforms
        </p>
      </div>

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-6">
            <fetcher.Form
              method="post"
              className="space-y-5"
              onSubmit={(e) => {
                const fd = new FormData(e.currentTarget);
                fetcher.submit(fd, { method: "post" });
                showToast("Embed settings saved", "success");
                e.preventDefault();
              }}
            >
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="embed-title">Title</Label>
                <Input
                  id="embed-title"
                  ref={titleRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onFocus={() => setFocusedField("title")}
                  className="font-mono text-sm"
                  name="embed_title"
                  placeholder="e.g. {{image.name}}"
                />
                <p className="text-xs text-muted-foreground">
                  Shown as the embed title.
                </p>
              </div>

              {/* Author */}
              <div className="space-y-1.5">
                <Label htmlFor="embed-author">Author</Label>
                <Input
                  id="embed-author"
                  ref={authorRef}
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  onFocus={() => setFocusedField("author")}
                  className="font-mono text-sm"
                  name="embed_author"
                  placeholder="e.g. {{uploader.name}}"
                />
                <p className="text-xs text-muted-foreground">
                  Shown above the title in smaller text.
                </p>
              </div>

              {/* Template variable chips */}
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Insert variable into{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setFocusedField("title");
                      titleRef.current?.focus();
                    }}
                    className={`font-semibold transition-colors ${focusedField === "title" ? "text-primary" : "text-foreground hover:text-primary"}`}
                  >
                    title
                  </button>{" "}
                  or{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setFocusedField("author");
                      authorRef.current?.focus();
                    }}
                    className={`font-semibold transition-colors ${focusedField === "author" ? "text-primary" : "text-foreground hover:text-primary"}`}
                  >
                    author
                  </button>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARS.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => handleInsert(v.key)}
                      title={`Example: ${v.example}`}
                      className="text-[11px] font-mono px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors"
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colour */}
              <div className="space-y-1.5">
                <Label htmlFor="embed-colour">Accent Colour</Label>
                <div className="flex gap-2 items-center">
                  <input
                    id="embed-colour"
                    type="color"
                    value={colour}
                    onChange={(e) => setColour(e.target.value)}
                    name="embed_colour"
                    className="h-9 w-14 rounded-md border border-border cursor-pointer bg-transparent p-0.5"
                  />
                  <Input
                    value={colour}
                    onChange={(e) => setColour(e.target.value)}
                    className="font-mono text-sm w-32"
                    placeholder="#e05cd9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  The left border colour on Discord embeds.
                </p>
              </div>

              <Button type="submit" className="text-white gap-2">
                <Palette className="h-3.5 w-3.5" />
                Save Settings
              </Button>
            </fetcher.Form>
          </div>

          {/* Discord preview */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Discord Preview
            </p>

            {/* Discord window mockup */}
            <div className="rounded-xl overflow-hidden border border-[#1e1f22] shadow-2xl">
              {/* Channel header */}
              <div className="bg-[#313338] px-4 py-2.5 border-b border-[#1e1f22] flex items-center gap-2">
                <Hash className="h-4 w-4 text-[#80848e]" />
                <span className="text-sm font-semibold text-white">
                  general
                </span>
                <div className="ml-auto flex items-center gap-3 text-[#80848e]">
                  <Users className="h-4 w-4" />
                </div>
              </div>

              {/* Messages area */}
              <div className="bg-[#313338] px-4 py-4 space-y-0.5">
                {/* Date divider */}
                <div className="flex items-center gap-3 py-2 mb-3">
                  <div className="flex-1 h-px bg-[#3f4147]" />
                  <span className="text-[11px] font-medium text-[#80848e]">
                    Today
                  </span>
                  <div className="flex-1 h-px bg-[#3f4147]" />
                </div>

                {/* Message */}
                <div className="flex gap-3 group hover:bg-[#2e3035] px-2 py-0.5 rounded">
                  <div className="shrink-0 mt-0.5">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={
                          data!.user.avatar_url
                            ? `/avatar/${data!.user.id}`
                            : `https://api.dicebear.com/6.x/initials/svg?seed=${data!.user.username}`
                        }
                        alt={data!.user.username}
                      />
                      <AvatarFallback className="text-sm font-bold bg-primary/20 text-primary">
                        {data!.user.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">
                        {data!.user.username}
                      </span>
                      <span className="text-[11px] text-[#80848e]">
                        Today at{" "}
                        {new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-[#dbdee1]">check this out</p>
                    <p className="text-sm text-[#00a8fc] hover:underline cursor-pointer mt-0.5">
                      https://{siteName}/i/example
                    </p>

                    {/* Embed card */}
                    <div
                      className="mt-2 rounded max-w-sm overflow-hidden"
                      style={{
                        borderLeft: `4px solid ${colour}`,
                        backgroundColor: "#2b2d31",
                      }}
                    >
                      <div className="px-3 py-3 space-y-2">
                        {/* Provider */}
                        <p className="text-[11px] text-[#80848e]">{siteName}</p>

                        {/* Author */}
                        {author && (
                          <p className="text-xs text-[#dbdee1] font-medium">
                            {applyTemplates(author)}
                          </p>
                        )}

                        {/* Title */}
                        {title && (
                          <p className="text-sm font-semibold text-[#00a8fc] hover:underline cursor-pointer">
                            {applyTemplates(title)}
                          </p>
                        )}

                        {/* Image preview */}
                        <div className="rounded overflow-hidden bg-[#1e1f22] aspect-video flex items-center justify-center mt-1">
                          <img
                            src="/logo.png"
                            alt="preview"
                            className="max-h-full max-w-full object-contain opacity-50"
                          />
                        </div>

                        {/* Footer */}
                        <p className="text-[10px] text-[#80848e]">
                          Hosted with 🩵 at {siteName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message input bar */}
              <div className="bg-[#383a40] px-4 py-3 flex items-center gap-2">
                <div className="flex-1 bg-[#383a40] rounded-lg px-3 py-1.5 text-sm text-[#80848e]">
                  Message #general
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
