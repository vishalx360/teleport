import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  BOOKED: "bg-blue-100 text-blue-800 ring-blue-200",
  ACCEPTED: "bg-sky-100 text-sky-800 ring-sky-200",
  ARRIVED: "bg-blue-100 text-blue-800 ring-blue-200",
  PICKED_UP: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  IN_TRANSIT: "bg-blue-100 text-blue-800 ring-blue-200",
  DELIVERED: "bg-blue-100 text-blue-800 ring-blue-200",
  CANCELLED: "bg-slate-100 text-slate-700 ring-slate-200",
  FAILED: "bg-rose-100 text-rose-800 ring-rose-200",
};

export default function StatusBadge({ status, className }: { status: string; className?: string }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", styles[status] ?? "bg-slate-100 text-slate-700 ring-slate-200", className)}>{status.replaceAll("_", " ")}</span>;
}
