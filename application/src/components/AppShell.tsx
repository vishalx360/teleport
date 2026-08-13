"use client";

import { Clock3, Home, LogOut, PackageCheck, Settings } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isDriver = session?.user.role === "DRIVER";
  const home = isDriver ? "/dashboard/driver" : "/dashboard/user";
  const nav = [
    { href: home, label: "Home", icon: Home },
    { href: "/activity", label: "Activity", icon: Clock3 },
    { href: "/settings", label: "Account", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#101114] text-slate-100 lg:h-screen lg:overflow-hidden">
      <div className="min-h-screen lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[88px_minmax(0,1fr)] lg:overflow-hidden">
        <aside className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#111216]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:static lg:flex lg:min-h-0 lg:flex-col lg:items-center lg:border-0 lg:border-r lg:border-white/10 lg:bg-[#121317] lg:px-3 lg:py-5">
          <Link
            href={home}
            aria-label="Teleport home"
            className="hidden lg:grid lg:h-12 lg:w-12 lg:place-items-center lg:rounded-2xl lg:bg-blue-500 lg:text-white"
          >
            <PackageCheck className="h-6 w-6" />
          </Link>
          <nav className="grid grid-cols-3 gap-1 lg:mt-10 lg:flex lg:w-full lg:flex-col lg:gap-3">
            {nav.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href ||
                (href !== home && pathname.startsWith(`${href}/`));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`group relative flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition lg:h-12 lg:w-full lg:justify-center lg:p-0 ${
                    active
                      ? "bg-blue-500 text-white"
                      : "text-slate-500 hover:bg-white/5 hover:text-slate-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="lg:hidden">{label}</span>
                  <span className="pointer-events-none absolute left-16 hidden whitespace-nowrap rounded-lg bg-black px-2 py-1.5 text-xs text-white opacity-0 shadow-lg transition group-hover:opacity-100 lg:block">
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-auto hidden h-12 w-12 place-items-center rounded-xl text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400 lg:grid"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </aside>

        <main className="min-w-0 pb-20 lg:min-h-0 lg:pb-0">{children}</main>
      </div>
    </div>
  );
}
