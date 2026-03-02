import { Link } from "@remix-run/react";

import { useRootData } from "~/root";

export default function TOS() {
  const rootData = useRootData();
  const siteName = rootData?.siteName ?? "jays.pics";
  const baseDomain = rootData?.baseDomain ?? "jays.pics";

  return (
    <div className="flex min-h-screen flex-col items-center bg-background dark text-white p-6 space-y-2">
      <h1 className="text-2xl font-bold mb-4">Terms of Service</h1>
      <p className="mb-2">
        By using this service, you agree to abide by all applicable laws and
        regulations.
      </p>
      <p className="mb-2">
        Do not upload content that you do not have the rights to share.
      </p>
      <p className="mb-2">
        {siteName} acts solely as a host. You are fully responsible for anything
        you upload.
      </p>
      <p className="mb-2">
        We have zero tolerance for child sexual abuse material and will report
        it to the authorities.
      </p>
      <p className="mb-2">
        If you believe content infringes your copyright, send a DMCA notice to{" "}
        <Link to={`mailto:admin@${baseDomain}`}>admin@{baseDomain}</Link>.
      </p>
      <p className="mb-2">
        We may remove content or suspend accounts at our discretion if we become
        aware of illegal or abusive material.
      </p>
      <p>
        Uploads are logged with your IP address, and we will comply with lawful
        requests from authorities.
      </p>
    </div>
  );
}
