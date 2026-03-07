import { Link } from "@remix-run/react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Sidebar } from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";

interface DashboardNavbarProps {
  user: {
    id: string;
    username: string;
    permissions: string;
    notifications: { id: string; content: string; created_at: string }[];
    images: any[];
  };
  version: string;
  siteName: string;
  friendRequestCount?: number;
}

export function DashboardNavbar({
  user,
  version,
  siteName,
  friendRequestCount = 0,
}: Readonly<DashboardNavbarProps>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 flex h-14 items-center justify-between">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
            className="p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link
            to="/dashboard/index"
            className="font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent"
          >
            {siteName}
          </Link>
          {/* Spacer to balance the hamburger */}
          <div className="w-9" />
        </div>
      </header>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Backdrop */}
            <motion.button
              title="Close navigation"
              type="button"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            {/* Sidebar panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="relative z-50 h-full"
            >
              <Sidebar
                onLinkClick={() => setOpen(false)}
                user={user}
                version={version}
                siteName={siteName}
                friendRequestCount={friendRequestCount}
                className={cn("border-r bg-background h-full")}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
