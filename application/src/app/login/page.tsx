"use client";

import { Button } from "@/components/ui/button";
import { Bike, Box, ChevronRight, Github, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { signIn } from "next-auth/react";

const localRoles = [
  { role: "USER", title: "Continue as local customer", copy: "Book and follow a test delivery", icon: Box, href: "/dashboard/user" },
  { role: "DRIVER", title: "Continue as local driver", copy: "Accept and manage test deliveries", icon: Truck, href: "/dashboard/driver" },
] as const;

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-[#101114] lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative hidden overflow-hidden bg-[#1d1e1b] px-12 py-14 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.10)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.10)_1px,transparent_1px)] [background-size:48px_48px]" /><div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-blue-500/25 blur-3xl" /><div className="absolute right-0 top-20 h-64 w-64 rounded-full bg-blue-700/20 blur-3xl" />
        <div className="relative flex items-center gap-3 text-xl font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500 text-white"><PackageCheck className="h-5 w-5" /></span>teleport</div>
        <div className="relative my-auto max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">Local delivery, refined</p>
          <h1 className="text-5xl font-semibold leading-tight">Every route, beautifully clear.</h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-slate-300">A clear delivery experience for customers and a focused workspace for drivers.</p>
        </div>
        <div className="relative flex gap-7 text-sm text-slate-300"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-400" /> Secure by design</span><span className="flex items-center gap-2"><Bike className="h-4 w-4 text-blue-400" /> Live delivery updates</span></div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500 text-white"><PackageCheck className="h-5 w-5" /></span><span className="text-xl font-bold">teleport</span></div>
          <p className="eyebrow">Welcome</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Choose your workspace</h2>
          <p className="mt-3 text-slate-400">Sign in with your account, or use a local development account to test the complete delivery workflow.</p>

          <div className="mt-8 grid gap-3">
            {localRoles.map(({ role, title, copy, icon: Icon, href }) => <button key={role} onClick={() => signIn("local-test", { role, callbackUrl: href })} className="group flex min-h-20 items-center gap-4 rounded-2xl border border-white/10 bg-white/[.04] p-4 text-left transition hover:border-blue-400/50 hover:bg-white/[.07]">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/10 text-blue-400"><Icon className="h-5 w-5" /></span><span className="flex-1"><span className="block font-semibold text-white">{title}</span><span className="mt-0.5 block text-sm text-slate-400">{copy}</span></span><ChevronRight className="h-5 w-5 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-blue-400" />
            </button>)}
          </div>
          <div className="my-8 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-slate-500 before:h-px before:flex-1 before:bg-white/10 after:h-px after:flex-1 after:bg-white/10">or sign in</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" onClick={() => signIn("google", { callbackUrl: "/" })} className="h-11"><span className="font-semibold">Google</span></Button>
            <Button variant="outline" onClick={() => signIn("github", { callbackUrl: "/" })} className="h-11"><Github className="mr-2 h-4 w-4" /> GitHub</Button>
          </div>
          <p className="mt-7 text-center text-xs leading-5 text-slate-500">Local test accounts are available only when enabled for development. They use seeded test data and must never be enabled in production.</p>
        </div>
      </section>
    </main>
  );
}
