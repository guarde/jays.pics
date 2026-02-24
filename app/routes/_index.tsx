import { Progress } from "@prisma/client";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link, redirect, useLoaderData } from "@remix-run/react";
import {
  ChevronRight,
  Database,
  FileImage,
  Globe,
  Link2,
  MessageSquare,
  User,
  Zap,
} from "lucide-react";
import prettyBytes from "pretty-bytes";
import { FaGithub } from "react-icons/fa";

import uploadIllustration from "~/assets/uploadIllustration.svg";
import { Navbar } from "~/components/navbar";
import AnimatedGradientText from "~/components/ui/animated-gradient-text";
import { Button } from "~/components/ui/button";
import FlickeringGrid from "~/components/ui/flickering-grid";
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

export default function Index() {
  const { imageTotal, userTotal, storageTotal, domainsTotal } =
    useLoaderData<typeof loader>();

  return (
    <div className="flex min-h-screen flex-col items-center bg-background dark">
      <Navbar />
      <div className="relative mx-auto container dark">
        <section id="hero">
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-x-8 w-full p-6 lg:p-12 border-x overflow-hidden">
            <div className="z-10 flex min-h-64 items-start justify-center flex-col">
              <AnimatedGradientText align="left">
                🎉 <hr className="mx-2 h-4 w-px shrink-0 bg-gray-300" />
                <span
                  className={cn(
                    `inline animate-gradient bg-gradient-to-r from-primary via-secondary to-primary bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent`,
                  )}
                >
                  jays.pics v2
                </span>
                {/* <ChevronRight className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" /> */}
              </AnimatedGradientText>
              <p className="text-[3.5rem] font-semibold text-left text-white">
                jays<span className="text-primary">.</span>pics
              </p>

              <h2 className="mt-[.5rem] text-[1rem] leading-relaxed max-w-md text-left text-white">
                Say goodbye to complicated image hosting. jays.pics gives you a
                streamlined platform to store and share your files, with
                enterprise-grade security and lightning-fast delivery on your
                images.
              </h2>

              <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start text-lg">
                <div className="rounded-md shadow">
                  <Link to="/register">
                    <Button size="lg" className="group text-white">
                      Get Started
                      <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            <div className="z-0 relative flex items-center justify-center">
              <img
                src={uploadIllustration}
                alt="A person uploading a file"
                className="w-full"
              />
            </div>
          </div>
        </section>
        <section id="statistics">
          <div className="relative mx-auto container text-white">
            <div className="text-center relative mx-auto border-x border-t overflow-hidden p-2 py-8 md:p-12">
              <h1 className="text-sm text-muted-foreground text-balance font-semibold tracking-tigh uppercase relative z-20">
                Statistics
              </h1>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-full w-full bg-gradient-to-r from-transparent via-background to-transparent z-10"></div>
              <FlickeringGrid
                className="z-0 absolute inset-0 size-full"
                squareSize={4}
                gridGap={6}
                color="#6B7280"
                maxOpacity={0.5}
                flickerChance={0.1}
                width={2560}
                height={1440}
              />
            </div>
            <div className="border-x border-t grid grid-cols-1 sm:grid-cols-4">
              <div className="flex flex-col items-center justify-center space-y-2 p-4 border-r">
                <div className="text-[4rem] font-bold font-mono tracking-tight">
                  {imageTotal}
                </div>
                <div className="flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  <span>Uploads</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 p-4 border-r">
                <div className="text-[4rem] font-bold font-mono tracking-tight">
                  {userTotal}
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Users</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 p-4 border-r">
                <div className="text-[4rem] font-bold font-mono tracking-tight">
                  {prettyBytes(storageTotal ?? 0).replace(" ", "")}
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>Stored</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 p-4">
                <div className="text-[4rem] font-bold font-mono tracking-tight">
                  {domainsTotal}
                </div>
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  <span>Domains</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="features">
          <div className="relative mx-auto container text-white">
            <div className="text-center relative mx-auto border-x border-t overflow-hidden p-2 py-8 md:p-12">
              <h1 className="text-sm text-muted-foreground text-balance font-semibold tracking-tigh uppercase relative z-20">
                Features
              </h1>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-full w-full bg-gradient-to-r from-transparent via-background to-transparent z-10"></div>
              <FlickeringGrid
                className="z-0 absolute inset-0 size-full"
                squareSize={4}
                gridGap={6}
                color="#6B7280"
                maxOpacity={0.5}
                flickerChance={0.1}
                width={2560}
                height={1440}
              />
            </div>
            <div className="border-x border-t grid grid-cols-1 sm:grid-cols-3">
              <div className="flex flex-col items-center justify-center space-y-2 p-8 border-r">
                <div className="text-2xl mb-2">
                  <Globe className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg">Custom Domains</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Use your own domain or another from the community pool
                </p>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 p-8 border-r">
                <div className="text-2xl mb-2">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg">Cool Support</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Friendly team ready to help you with any issues
                </p>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 p-8">
                <div className="text-2xl mb-2">
                  <Zap className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg">Lightning Fast</h3>
                <p className="text-sm text-muted-foreground text-center">
                  We make sure to deliver your images as fast as possible
                </p>
              </div>
            </div>
          </div>
        </section>
        <section id="faq">
          <div className="relative mx-auto container text-white">
            <div className="text-center relative mx-auto border-x border-t overflow-hidden p-2 py-8 md:p-12">
              <h1 className="text-sm text-muted-foreground text-balance font-semibold tracking-tigh uppercase relative z-20">
                Frequently Asked Questions (FAQ)
              </h1>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-full w-full bg-gradient-to-r from-transparent via-background to-transparent z-10"></div>
              <FlickeringGrid
                className="z-0 absolute inset-0 size-full"
                squareSize={4}
                gridGap={6}
                color="#6B7280"
                maxOpacity={0.5}
                flickerChance={0.1}
                width={2560}
                height={1440}
              />
            </div>
            <div className="border-x border-t grid grid-cols-1 sm:grid-cols-3">
              <div className="flex flex-col items-center justify-center space-y-2 p-8 border-r">
                <h3 className="font-semibold text-lg">What is jays.pics?</h3>
                <p className="text-sm text-muted-foreground text-center">
                  jays.pics is a modern image hosting platform focused on
                  simplicity and speed.
                </p>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 p-8 border-r">
                <h3 className="font-semibold text-lg">Is it free?</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Yes, we offers a generous free tier with essential features.
                </p>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 p-8">
                <h3 className="font-semibold text-lg">
                  What files can I upload?
                </h3>
                {/* TODO: update this lol */}
                <p className="text-sm text-muted-foreground text-center">
                  We support most common image formats including PNG, JPEG, GIF
                  etc.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <footer className="w-full border-t">
        <div className="container mx-auto text-white">
          <div className="flex items-center justify-between p-4">
            <div className="text-sm text-muted-foreground">
              © 2025 jays.pics. All rights reserved.
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/tos"
                className="text-muted-foreground hover:text-foreground"
              >
                Terms of Service
              </Link>
              <Link
                to="https://github.com/guarde/jays.pics"
                className="text-muted-foreground hover:text-foreground"
              >
                <FaGithub className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
