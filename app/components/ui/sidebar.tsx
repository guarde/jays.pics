import { Link, NavLink } from "@remix-run/react";
import {
  Bell,
  BellDotIcon,
  ChevronDown,
  Code,
  Cog,
  FileQuestion,
  GitBranch,
  Globe2,
  Home,
  Image,
  Link2,
  LogOut,
  Shield,
  SquareUser,
  TableProperties,
  Upload,
  WandSparkles,
  Wrench,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FaDiscord } from "react-icons/fa";

import { cn, formatNumber } from "~/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { NotificationTray } from "./notification-tray";
import { Separator } from "./separator";
import { ThemeToggle } from "./themetoggle";

interface SidebarProps {
  className?: string;
  user: {
    id: string;
    username: string;
    is_admin: boolean;
    notifications: any[];
    images: any[];
  };
  version: string;
  siteName: string;
  onLinkClick?: () => void;
}

function NavItem({
  to,
  icon: Icon,
  children,
  badge,
  onClick,
}: {
  to: string;
  icon: React.ElementType;
  children: React.ReactNode;
  badge?: string | number;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 w-full",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{children}</span>
      {badge !== undefined && (
        <span className="ml-auto bg-secondary text-secondary-foreground rounded-md px-1.5 py-0.5 text-xs font-medium">
          {badge}
        </span>
      )}
    </NavLink>
  );
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

  const hasNotifications = notifications.length > 0;
  const activeImageCount = user.images.filter((img) => !img.deleted_at).length;
  const initials = user.username.slice(0, 2).toUpperCase();

  const bellRef = useRef<HTMLButtonElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTray) return;
    const handler = (e: MouseEvent) => {
      if (
        !bellRef.current?.contains(e.target as Node) &&
        !trayRef.current?.contains(e.target as Node)
      ) {
        setShowTray(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTray]);

  return (
    <div
      className={cn("flex flex-col h-full w-64 shrink-0 relative", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
        <Link
          to="/dashboard/index"
          onClick={onLinkClick}
          className="font-bold text-base bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent"
        >
          {siteName}
        </Link>
        <button
          ref={bellRef}
          type="button"
          onClick={() => setShowTray(!showTray)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors relative"
        >
          {hasNotifications ? (
            <BellDotIcon className="h-4 w-4 text-primary" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Notification tray — fixed so it's not clipped by sidebar width */}
      {showTray && (
        <div ref={trayRef} className="fixed top-[57px] left-2 z-[200]">
          <NotificationTray
            notifications={notifications}
            onRemove={removeNotification}
          />
        </div>
      )}

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Main section */}
        <div className="space-y-0.5">
          <p className="px-3 mb-1.5 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
            Main
          </p>
          <NavItem to="/dashboard/index" icon={Home} onClick={onLinkClick}>
            Dashboard
          </NavItem>
          <NavItem
            to="/dashboard/images"
            icon={Image}
            onClick={onLinkClick}
            badge={formatNumber(activeImageCount)}
          >
            Images
          </NavItem>
          <NavItem to="/dashboard/referrals" icon={Link2} onClick={onLinkClick}>
            Referrals
          </NavItem>
          <NavItem to="/dashboard/domains" icon={Globe2} onClick={onLinkClick}>
            Domains
          </NavItem>
          <NavItem
            to="/dashboard/help"
            icon={FileQuestion}
            onClick={onLinkClick}
          >
            Help
          </NavItem>
        </div>

        {/* Upload Config section */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => setShowUploadMenu(!showUploadMenu)}
            className="flex items-center gap-3 px-3 py-1.5 w-full text-xs font-semibold text-muted-foreground/60 hover:text-muted-foreground uppercase tracking-wider transition-colors"
          >
            <Wrench className="h-3 w-3 shrink-0" />
            <span className="flex-1 text-left">Upload Config</span>
            <ChevronDown
              className={cn(
                "h-3 w-3 shrink-0 transition-transform duration-200",
                showUploadMenu && "rotate-180",
              )}
            />
          </button>
          {showUploadMenu && (
            <div className="space-y-0.5">
              <NavItem
                to="/dashboard/domain-selector"
                icon={TableProperties}
                onClick={onLinkClick}
              >
                Domain Selector
              </NavItem>
              <NavItem to="/dashboard/embed" icon={Code} onClick={onLinkClick}>
                Embed
              </NavItem>
              <NavItem
                to="/dashboard/effects"
                icon={WandSparkles}
                onClick={onLinkClick}
              >
                Effects
              </NavItem>
              <NavItem
                to="/dashboard/triggers"
                icon={GitBranch}
                onClick={onLinkClick}
                badge="BETA"
              >
                Triggers
              </NavItem>
              <NavItem
                to="/dashboard/upload-config/settings"
                icon={Cog}
                onClick={onLinkClick}
              >
                Config
              </NavItem>
            </div>
          )}
        </div>
      </div>

      {/* Bottom section */}
      <div className="shrink-0 border-t border-border px-3 py-3 space-y-0.5">
        <NavItem to="/dashboard/upload" icon={Upload} onClick={onLinkClick}>
          Upload
        </NavItem>

        <div className="py-0.5">
          <ThemeToggle />
        </div>

        <Separator className="my-2" />

        {/* User menu trigger */}
        <button
          type="button"
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium w-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={`/avatar/${user.id}`} alt={user.username} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 text-left truncate">{user.username}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200",
              showUserMenu && "rotate-180",
            )}
          />
        </button>

        {showUserMenu && (
          <div className="space-y-0.5 pt-0.5">
            <NavItem to="/profile/me" icon={SquareUser} onClick={onLinkClick}>
              Profile
            </NavItem>
            {user.is_admin && (
              <NavItem to="/admin/index" icon={Shield} onClick={onLinkClick}>
                Admin Dashboard
              </NavItem>
            )}
            <NavItem to="/dashboard/settings" icon={Cog} onClick={onLinkClick}>
              Settings
            </NavItem>
            <Link
              to="/logout"
              onClick={onLinkClick}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Log out
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground/60 px-1">
          <span>v{version}</span>
          <Link
            to="https://discord.gg/screenshot"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            <FaDiscord className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/tos"
            className="underline hover:text-foreground transition-colors"
          >
            TOS
          </Link>
        </div>
      </div>
    </div>
  );
}
