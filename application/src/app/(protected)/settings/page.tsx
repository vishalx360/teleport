"use client";

import BackButton from "@/components/BackButton";
import { Bike, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-white/10 py-4 last:border-0">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-1 truncate font-medium text-white">{value}</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const isDriver = user?.role === "DRIVER";

  return (
    <div className="h-full min-h-screen overflow-y-auto bg-[#101114] px-4 py-6 sm:px-6 lg:min-h-0 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start gap-3">
          <BackButton />
          <div>
            <p className="eyebrow">Account</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Profile & settings
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Your identity and delivery account information.
            </p>
          </div>
        </div>

        <section className="mt-7 rounded-[1.75rem] border border-white/10 bg-[#17191e] p-5 sm:p-7">
          <div className="flex items-center gap-4 border-b border-white/10 pb-6">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-500 text-white">
              <UserRound className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-white">
                {user?.name ?? "Teleport member"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {isDriver ? "Driver account" : "Customer account"}
              </p>
            </div>
          </div>

          <DetailRow
            icon={Mail}
            label="Email"
            value={user?.email ?? "Not provided"}
          />
          <DetailRow
            icon={ShieldCheck}
            label="Account type"
            value={isDriver ? "Driver" : "Customer"}
          />
          {isDriver && (
            <DetailRow
              icon={Bike}
              label="Vehicle"
              value={(user?.vehicleClass ?? "Not selected")
                .toLowerCase()
                .replaceAll("_", " ")}
            />
          )}
        </section>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/5 font-semibold text-rose-300 transition hover:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
