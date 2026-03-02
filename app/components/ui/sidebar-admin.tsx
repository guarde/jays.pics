import { Link, NavLink } from "@remix-run/react";
import {
  ArrowLeft,
  CircleX,
  DollarSign,
  Globe2,
  HardDrive,
  Home,
  Images,
  Logs,
  PanelsTopLeft,
  Users,
} from "lucide-react";

import { cn } from "~/lib/utils";

import { Separator } from "./separator";
import { ThemeToggle } from "./themetoggle";

interface SidebarAdminProps {
  className?: string;
  user: {
    username: string;
    images: any[];
    is_admin: boolean;
  };
  siteName: string;
  onLinkClick?: () => void;
}

function NavItem({
  to,
  icon: Icon,
  children,
  onClick,
}: {
  to: string;
  icon: React.ElementType;
  children: React.ReactNode;
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
    </NavLink>
  );
}

export function SidebarAdmin({
  className,
  user,
  siteName,
  onLinkClick,
}: Readonly<SidebarAdminProps>) {
  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <div className={cn("flex flex-col h-full w-64 relative", className)}>
      {/* Header */}
      <div className="flex items-center px-4 h-14 border-b border-border shrink-0">
        <Link
          to="/admin/index"
          onClick={onLinkClick}
          className="flex items-baseline gap-1.5"
        >
          <span className="font-bold text-base bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            {siteName}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            admin
          </span>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <NavItem to="/admin/index" icon={Home} onClick={onLinkClick}>
          Dashboard
        </NavItem>
        <NavItem to="/admin/users" icon={Users} onClick={onLinkClick}>
          Users
        </NavItem>
        <NavItem to="/admin/images" icon={Images} onClick={onLinkClick}>
          Images
        </NavItem>
        <NavItem to="/admin/domains" icon={Globe2} onClick={onLinkClick}>
          Domains
        </NavItem>
        <NavItem
          to="/admin/subscriptions"
          icon={HardDrive}
          onClick={onLinkClick}
        >
          Subscriptions
        </NavItem>
        <NavItem to="/admin/logs" icon={Logs} onClick={onLinkClick}>
          Logs
        </NavItem>
        <NavItem to="/admin/errors" icon={CircleX} onClick={onLinkClick}>
          Errors
        </NavItem>
        <NavItem to="/admin/site" icon={PanelsTopLeft} onClick={onLinkClick}>
          Site
        </NavItem>
        <NavItem
          to="/admin/aws-pricing"
          icon={DollarSign}
          onClick={onLinkClick}
        >
          AWS Pricing
        </NavItem>
      </div>

      {/* Bottom */}
      <div className="shrink-0 border-t border-border px-3 py-3 space-y-0.5">
        {/* User display */}
        <div className="flex items-center gap-3 px-3 py-2 mb-0.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            {initials}
          </div>
          <span className="flex-1 text-sm text-muted-foreground truncate">
            {user.username}
          </span>
          <span className="text-xs bg-primary/10 text-primary rounded px-1.5 py-0.5 shrink-0">
            admin
          </span>
        </div>

        <div className="py-0.5">
          <ThemeToggle />
        </div>

        <Separator className="my-1.5" />

        <Link
          to="/dashboard/index"
          onClick={onLinkClick}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
