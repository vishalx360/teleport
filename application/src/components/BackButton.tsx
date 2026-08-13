"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function BackButton({
  fallbackHref = "/",
  className,
}: {
  fallbackHref?: string;
  className?: string;
}) {
  const router = useRouter();

  const goBack = () => {
    let hasInAppReferrer = false;
    try {
      hasInAppReferrer =
        Boolean(document.referrer) &&
        new URL(document.referrer).origin === window.location.origin;
    } catch {
      hasInAppReferrer = false;
    }

    // Never send someone back to an external site or an empty browser tab.
    if (hasInAppReferrer && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Go back"
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-[#121318]/90 text-white shadow-xl backdrop-blur transition hover:border-white/25 hover:bg-[#202228] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
        className,
      )}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
