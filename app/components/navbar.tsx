"use client";

import { Link } from "@remix-run/react";

import { useRootData } from "~/root";

import { Button } from "./ui/button";

export function Navbar() {
  const rootData = useRootData();
  const siteName = rootData?.siteName ?? "jays.pics";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-4 mx-auto flex h-14 items-center">
        <div className="flex-1">
          <Link to="/" className="flex items-center">
            <span className="font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              {siteName}
            </span>
          </Link>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/login">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-white"
              size="sm"
            >
              Sign in
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="text-white">
              Get Started
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
