import BackButton from "@/components/BackButton";
import { PackageCheck } from "lucide-react";

export default function AppPageHeader({
  title,
  description,
  fallbackHref,
}: {
  title: string;
  description?: string;
  fallbackHref?: string;
}) {
  return (
    <header className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 py-5 sm:px-6 lg:px-7">
      <BackButton fallbackHref={fallbackHref} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <PackageCheck className="hidden h-4 w-4 text-blue-400 sm:block" />
          <h1 className="truncate text-lg font-semibold text-white sm:text-xl">
            {title}
          </h1>
        </div>
        {description && (
          <p className="hidden text-sm text-slate-400 sm:block">
            {description}
          </p>
        )}
      </div>
    </header>
  );
}
