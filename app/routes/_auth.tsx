import { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { redirectIfUser } from "~/services/auth.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Authorization | jays.pics" },
    { name: "description", content: "Invite-only Image Hosting" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  return redirectIfUser(request);
}

export default function Authorization() {
  const [shouldShowEmoji, setShouldShowEmoji] = useState(true);
  const [shouldRenderContent, setShouldRenderContent] = useState(false);

  // shouldRenderContent is an extremely awful implementation
  // as slower connections could assume an error with the website
  // as they will see a grey screen for longer/forever
  // This is a temporary workaround to stop the wave emoji
  // from flickering when navigating to this page

  useEffect(() => {
    if (localStorage.getItem("hasSeenEmoji") === "true") {
      setShouldShowEmoji(false);
    } else {
      setTimeout(() => {
        localStorage.setItem("hasSeenEmoji", "true");
        setShouldShowEmoji(false);
      }, 2000);
    }
    setShouldRenderContent(true);
  }, [shouldShowEmoji]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background dark">
      <div className="relative w-full max-w-md dark">
        {shouldRenderContent && (
          <AnimatePresence>
            {shouldShowEmoji ? (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  rotate: [0, -10, 10, -10, 10, 0],
                }}
                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.5 } }}
                transition={{ duration: 2, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center justify-center text-9xl"
              >
                👋
              </motion.div>
            ) : (
              <Outlet />
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
