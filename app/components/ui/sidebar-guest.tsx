import { Link } from "@remix-run/react";
import { Home, LogIn } from "lucide-react";

import { useRootData } from "~/root";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

import { Separator } from "./separator";
import { ThemeToggle } from "./themetoggle";

interface SidebarProps {
  className?: string;
}

export function SidebarGuest({ className }: SidebarProps) {
  const rootData = useRootData();
  const siteName = rootData?.siteName ?? "jays.pics";

  return (
    <div className={cn("pb-12 w-64 shrink-0 relative", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            {siteName}
          </h2>
          <Separator className="my-4" />
          <div className="space-y-1">
            <Button
              asChild
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Index
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-0 right-0 px-3">
        <div className="space-y-1">
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start text-gray-900 dark:text-gray-100"
          >
            <ThemeToggle />
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start text-gray-900 dark:text-gray-100"
          >
            <Link to="/login">
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
