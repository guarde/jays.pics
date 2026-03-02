import { Link } from "@remix-run/react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Sidebar } from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";

interface DashboardNavbarProps {
  user: {
    username: string;
    is_admin: boolean;
    notifications: { id: string; content: string; created_at: string }[];
    images: any[];
  };
  version: string;
  siteName: string;
}

export function DashboardNavbar({
  user,
  version,
  siteName,
}: Readonly<DashboardNavbarProps>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 flex h-14 items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <Link to="/dashboard/index" className="font-bold">
            {siteName}
          </Link>
        </div>
      </header>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              title="Close"
              type="button"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/50"
            />
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
                className={cn("w-64 border-r bg-background h-full")}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
