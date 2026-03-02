import { Link } from "@remix-run/react";

import { useRootData } from "~/root";

export default function Privacy() {
  const rootData = useRootData();
  const baseDomain = rootData?.baseDomain ?? "jays.pics";

  return (
    <div className="flex min-h-screen flex-col items-center bg-background text-white p-6 space-y-2">
      <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
      <p className="mb-2">
        We respect your privacy and only use cookies to store your preferences.
      </p>
      <p className="mb-2">
        No personal data is sold or shared with third parties.
      </p>
      <p className="mb-2">
        For questions, contact{" "}
        <Link to={`mailto:admin@${baseDomain}`}>admin@{baseDomain}</Link>.
      </p>
    </div>
  );
}
