import { Link } from "@remix-run/react";
import {
  Bell,
  BellDotIcon,
  Cog,
  FileQuestion,
  Globe2,
  Home,
  Image,
  Link2,
  LogOut,
  Shield,
  Code,
  WandSparkles,
  ChevronDown,
  GitBranch,
  Wrench,
  TableProperties,
  User2,
  SquareUser,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { FaDiscord } from "react-icons/fa";

import { Button } from "~/components/ui/button";
import { cn, formatNumber } from "~/lib/utils";

import { NotificationTray } from "./notification-tray";
import { Separator } from "./separator";
import { ThemeToggle } from "./themetoggle";

interface SidebarProps {
  className?: string;
  user: {
    username: string;
    is_admin: boolean;
    notifications: any[];
    images: any[];
  };
  version: string;
  siteName: string;
  onLinkClick?: () => void;
}

export function Sidebar({
  className,
  user,
  version,
  siteName,
  onLinkClick,
}: Readonly<SidebarProps>) {
  const [showTray, setShowTray] = useState(false);
  const [notifications, setNotifications] = useState(user.notifications ?? []);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const removeNotification = (id: string) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  return (
    <div className={cn("pb-12 w-64 relative", className)}>
      {showTray && (
        <NotificationTray
          notifications={notifications}
          onRemove={removeNotification}
        />
      )}
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            {siteName}
            {!user.notifications || user.notifications.length === 0 ? (
              <Bell
                className="float-right w-4 m-1 cursor-pointer"
                onClick={() => setShowTray(!showTray)}
              />
            ) : (
              <BellDotIcon
                className="float-right w-4 m-1 hover:text-accent cursor-pointer"
                onClick={() => setShowTray(!showTray)}
              />
            )}
          </h2>
          <Separator className="my-4" />
          <div className="space-y-1">
            <Button
              onClick={onLinkClick}
              asChild
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <Link to="/dashboard/index" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button
              onClick={onLinkClick}
              asChild
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <Link to="/dashboard/images" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Images
                <span className="ml-auto bg-secondary text-secondary-foreground rounded-md px-2 py-0.5 text-xs">
                  {formatNumber(
                    user.images.filter((img) => !img.deleted_at).length,
                  )}
                </span>
              </Link>
            </Button>
            <Button
              onClick={onLinkClick}
              asChild
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <Link
                to="/dashboard/referrals"
                className="flex items-center gap-2"
              >
                <Link2 className="h-4 w-4" />
                Referrals
              </Link>
            </Button>
            <Button
              onClick={() => setShowUploadMenu(!showUploadMenu)}
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <div className="flex items-center gap-2 w-full">
                <Wrench className="h-4 w-4" />
                Upload Config
                <ChevronDown
                  className={cn(
                    "h-4 w-4 ml-auto transition-transform",
                    showUploadMenu && "rotate-180",
                  )}
                />
              </div>
            </Button>
            {showUploadMenu && (
              <div className="pl-4 space-y-1">
                <Button
                  onClick={onLinkClick}
                  asChild
                  variant="ghost"
                  className="w-full justify-start text-gray-900 dark:text-gray-100"
                >
                  <Link
                    to="/dashboard/domain-selector"
                    className="flex items-center gap-2"
                  >
                    <TableProperties className="h-4 w-4" />
                    Domain Selector
                  </Link>
                </Button>
                <Button
                  onClick={onLinkClick}
                  asChild
                  variant="ghost"
                  className="w-full justify-start text-gray-900 dark:text-gray-100"
                >
                  <Link
                    to="/dashboard/embed"
                    className="flex items-center gap-2"
                  >
                    <Code className="h-4 w-4" />
                    Embed
                  </Link>
                </Button>
                <Button
                  onClick={onLinkClick}
                  asChild
                  variant="ghost"
                  className="w-full justify-start text-gray-900 dark:text-gray-100"
                >
                  <Link
                    to="/dashboard/effects"
                    className="flex items-center gap-2"
                  >
                    <WandSparkles className="h-4 w-4" />
                    Effects
                  </Link>
                </Button>
                <Button
                  onClick={onLinkClick}
                  asChild
                  variant="ghost"
                  className="w-full justify-start text-gray-900 dark:text-gray-100"
                >
                  <Link
                    to="/dashboard/triggers"
                    className="flex items-center gap-2"
                  >
                    <GitBranch className="h-4 w-4" />
                    Triggers
                    <span className="ml-auto bg-secondary text-secondary-foreground rounded-md px-2 py-0.5 text-xs">
                      BETA
                    </span>
                  </Link>
                </Button>
                <Button
                  onClick={onLinkClick}
                  asChild
                  variant="ghost"
                  className="w-full justify-start text-gray-900 dark:text-gray-100"
                >
                  <Link
                    to="/dashboard/upload-config/settings"
                    className="flex items-center gap-2"
                  >
                    <Cog className="h-4 w-4" />
                    Config
                  </Link>
                </Button>
              </div>
            )}
            <Button
              onClick={onLinkClick}
              asChild
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <Link to="/dashboard/domains" className="flex items-center gap-2">
                <Globe2 className="h-4 w-4" />
                Domains
              </Link>
            </Button>
            <Button
              onClick={onLinkClick}
              asChild
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <Link to="/dashboard/help" className="flex items-center gap-2">
                <FileQuestion className="h-4 w-4" />
                Help
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
            onClick={onLinkClick}
            asChild
            variant="ghost"
            className="w-full justify-start text-gray-900 dark:text-gray-100"
          >
            <Link to="/dashboard/upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </Link>
          </Button>
          <Button
            onClick={() => setShowUserMenu(!showUserMenu)}
            variant="ghost"
            className="w-full justify-start text-gray-900 dark:text-gray-100"
          >
            <div className="flex items-center gap-2 w-full">
              <User2 className="h-4 w-4" />
              {user.username}
              <ChevronDown
                className={cn(
                  "h-4 w-4 ml-auto transition-transform",
                  showUserMenu && "rotate-180",
                )}
              />
            </div>
          </Button>
        </div>
        {showUserMenu && (
          <div className="pl-4 space-y-1">
            <Button
              onClick={onLinkClick}
              asChild
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <Link to="/profile/me" className="flex items-center gap-2">
                <SquareUser className="h-4 w-4" />
                Profile
              </Link>
            </Button>
            {user.is_admin ? (
              <Button
                onClick={onLinkClick}
                asChild
                variant="ghost"
                className="w-full justify-start text-gray-900 dark:text-gray-100"
              >
                <Link to="/admin/index" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin Dashboard
                </Link>
              </Button>
            ) : (
              <></>
            )}
            <Button
              onClick={onLinkClick}
              asChild
              variant="ghost"
              className="w-full justify-start text-gray-900 dark:text-gray-100"
            >
              <Link
                to="/dashboard/settings"
                className="flex items-center gap-2"
              >
                <Cog className="h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button
              onClick={onLinkClick}
              asChild
              variant="ghost"
              className="w-full justify-start hover:bg-red-700 hover:text-white text-gray-900 dark:text-gray-100"
            >
              <Link to="/logout" className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Log out
              </Link>
            </Button>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-3">
          <span>v{version}</span>
          <Link
            to="https://discord.gg/screenshot"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            <FaDiscord className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/tos" className="underline">
              TOS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
