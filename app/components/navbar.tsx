"use client";

import { Link } from "@remix-run/react";

import { useRootData } from "~/root";

import { Button } from "./ui/button";

export function Navbar() {
  const rootData = useRootData();
  const siteName = rootData?.siteName ?? "jays.pics";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-4 mx-auto flex h-14 items-center">
        <div className="flex-1">
          <Link to="/" className="flex items-center">
            <span className="font-bold text-white">{siteName}</span>
          </Link>
        </div>
        <div className="flex justify-end gap-2">
          <Link to="/login">
            <Button variant="outline" className="text-white" size="sm">
              Log in
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="secondary" size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
