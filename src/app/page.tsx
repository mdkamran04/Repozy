"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Github,
  Sparkles,
  Code2,
  Star,
  Infinity,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isLoaded && userId) router.replace("/dashboard");
  }, [userId, isLoaded, router]);

  if (!mounted || !isLoaded || userId) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#030303]">
        <div className="h-12 w-12 animate-pulse rounded-full bg-purple-500/20 blur-xl" />
      </div>
    );
  }

  const GITHUB_URL = "https://github.com/mdkamran04/Repozy";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030303] font-sans text-slate-300 selection:bg-purple-500/30">
      {/* 1. Visual Depth */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-[-10%] h-[600px] w-[1000px] -translate-x-1/2 bg-purple-600/10 opacity-50 blur-[140px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light" />
      </div>

      {/* 2. FLOATING NAV*/}
      <nav className="fixed left-1/2 top-6 z-50 w-[90%] max-w-4xl -translate-x-1/2 rounded-full border border-white/5 bg-black/40 px-6 py-3 backdrop-blur-xl transition-all hover:border-white/10">
        <div className="flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 p-[1px]">
              <div className="flex h-full w-full items-center justify-center rounded-[7px] bg-[#030303]">
                <Image
                  src="/repozy_logo_main.png"
                  alt="Logo"
                  width={48}
                  height={48}
                />
              </div>
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-white">
              Repozy
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-white"
            >
              Star{" "}
              <Star className="h-3 w-3 text-yellow-400 transition-transform group-hover:scale-110 group-hover:fill-yellow-400" />
            </a>
            <Link href="/sign-up">
              <Button
                size="sm"
                className="h-8 rounded-full bg-white px-4 text-[11px] font-bold text-black transition-transform hover:bg-slate-200 active:scale-95"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-44">
        {/* 3. HERO*/}
        <section className="mx-auto max-w-5xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-10 flex w-fit items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>The Future of Workflows</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-7xl font-black leading-[0.85] tracking-[-0.05em] text-white sm:text-9xl"
          >
            Repozy is <br />
            <span className="bg-gradient-to-b from-white via-white to-white/20 bg-clip-text text-transparent">
              Intelligence.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mx-auto mt-12 max-w-xl text-lg font-light leading-relaxed text-slate-400 sm:text-xl"
          >
            The AI-native layer for GitHub. From{" "}
            <b className="text-slate-300">Gemini-powered</b> code insights to{" "}
            <b className="text-slate-300">AssemblyAI</b> meeting transcriptions.
            <br /> One platform for the modern dev.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-14 flex flex-col items-center justify-center gap-5 sm:flex-row"
          >
            <Link href="/sign-up">
              <Button
                size="lg"
                className="h-14 rounded-2xl bg-purple-600 px-10 text-base font-bold shadow-[0_0_40px_-10px_rgba(168,85,247,0.5)] transition-all hover:bg-purple-500 active:scale-95"
              >
                Build with Repozy <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="lg"
                className="h-14 rounded-2xl border-white/10 bg-white/5 px-10 text-base font-bold transition-all hover:bg-white/10"
              >
                <Github className="mr-2 h-5 w-5" /> Repository
              </Button>
            </a>
          </motion.div>
        </section>

        {/* 4. The Feature Section*/}
        <section className="mx-auto max-w-7xl px-8 py-40">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
            {/* Feature: AI Repo Analysis */}
            <motion.div
              whileHover={{ y: -5 }}
              className="group relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent p-12 transition-all md:col-span-8"
            >
              <div className="absolute -right-20 -top-20 h-64 w-64 bg-purple-600/10 blur-[80px] transition-all group-hover:bg-purple-600/20" />
              <Code2 className="mb-8 h-10 w-10 text-purple-500" />
              <h3 className="text-3xl font-bold tracking-tight text-white">
                AI-Powered Analysis
              </h3>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-slate-400">
                Deep insights, automated documentation, and smart suggestions
                for your codebase using Gemini AI.
              </p>
            </motion.div>

            {/* Feature: Real-time Meetings */}
            <motion.div
              whileHover={{ y: -5 }}
              className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-12 transition-all hover:bg-white/[0.04] md:col-span-4"
            >
              <MessageSquare className="mb-8 h-8 w-8 text-blue-400" />
              <h3 className="text-2xl font-bold text-white">
                Meeting Insights
              </h3>
              <p className="mt-4 leading-relaxed text-slate-400">
                Auto-transcription via AssemblyAI with real-time Firebase
                scheduling.
              </p>
            </motion.div>

            {/* Feature: Credit System */}
            <motion.div
              whileHover={{ y: -5 }}
              className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-12 transition-all hover:bg-white/[0.04] md:col-span-5"
            >
              <CreditCard className="mb-8 h-8 w-8 text-emerald-400" />
              <h3 className="text-2xl font-bold text-white">
                Credit-Based Flow
              </h3>
              <p className="mt-4 leading-relaxed text-slate-400">
                Flexible monetization using Cashfree for pay-as-you-go access.
              </p>
            </motion.div>

            {/* Feature: Data Layer */}
            <motion.div
              whileHover={{ y: -5 }}
              className="group relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-12 transition-all md:col-span-7"
            >
              <div className="flex items-center gap-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10">
                  <Infinity className="h-8 w-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white">NeonDB Core</h3>
                  <p className="mt-2 max-w-sm text-slate-400">
                    Scalable storage for intelligent repository data management.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 5. FOOTER */}
        <footer className="border-t border-white/5 px-8 pb-12 pt-24 text-center">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-8">
            <div className="group flex cursor-pointer items-center gap-2 opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0">
              <div className="h-5 w-5 rounded bg-white p-1 transition-transform group-hover:rotate-12">
                <Image
                  src="/repozy_logo_main.png"
                  alt="Logo"
                  width={14}
                  height={14}
                />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">
                Repozy
              </span>
            </div>

            <div className="flex flex-col gap-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-600">
                Built for the next 100M developers
              </span>
              <span className="text-xs text-slate-500">
                © {new Date().getFullYear()} Repozy. All rights reserved.
              </span>
            </div>
          </div>
        </footer>
      </main>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;800&display=swap");
        body {
          font-family: "Plus+Jakarta+Sans", sans-serif;
          background: #030303;
        }
      `}</style>
    </div>
  );
}
