import { Link } from "@remix-run/react";
import {
  ArrowLeft,
  Bell,
  BellDotIcon,
  CircleX,
  Globe2,
  Hammer,
  HardDrive,
  Home,
  Images,
  Logs,
  PanelsTopLeft,
  Sticker,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

import { Separator } from "./separator";
import { ThemeToggle } from "./themetoggle";

interface SidebarProps {
  className?: string;
  user: {
    username: string;
    images: any[];
    is_admin: boolean;
  };
  siteName: string;
  onLinkClick?: () => void;
}

export function SidebarAdmin({
  className,
  user,
  siteName,
  onLinkClick,
}: SidebarProps) {
  return (
    <div className={cn("pb-12 w-64 relative", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            {siteName} - Admin
          </h2>
          <Separator className="my-4" />
          <div className="space-y-1">
            <Button
              onClick={onLinkClick}
              asChild
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <Link to="/admin/index">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button
              onClick={onLinkClick}
              asChild
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <Link to="/admin/users">
                <Users className="mr-2 h-4 w-4" />
                Users
              </Link>
            </Button>
            <Button
              onClick={onLinkClick}
              asChild
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <Link to="/admin/images">
                <Images className="mr-2 h-4 w-4" />
                Images
              </Link>
            </Button>
            <Button
              onClick={onLinkClick}
              asChild
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <Link to="/admin/domains">
                <Globe2 className="mr-2 h-4 w-4" />
                Domains
              </Link>
            </Button>
            <Button
              onClick={onLinkClick}
              asChild
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <Link to="/admin/subscriptions">
                <HardDrive className="mr-2 h-4 w-4" />
                Subscriptions
              </Link>
            </Button>
            <Button
              onClick={onLinkClick}
              asChild
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <Link to="/admin/logs">
                <Logs className="mr-2 h-4 w-4" />
                Logs
              </Link>
            </Button>
            <Button
              onClick={onLinkClick}
              asChild
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <Link to="/admin/errors">
                <CircleX className="mr-2 h-4 w-4" />
                Errors
              </Link>
            </Button>
            <Button
              onClick={onLinkClick}
              asChild
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <Link to="/admin/site">
                <PanelsTopLeft className="mr-2 h-4 w-4" />
                Site
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-0 right-0 px-3">
        <div className="space-y-1">
          <Button
            onClick={onLinkClick}
            asChild
            variant="ghost"
            className="w-full justify-start text-gray-900 dark:text-gray-100"
          >
            <Link to="#" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {user.username}
            </Link>
          </Button>
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
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Normal Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
