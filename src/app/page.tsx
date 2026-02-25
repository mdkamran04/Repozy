"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Github, Sparkles, Zap, Shield, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLoaded && userId) {
      router.replace("/dashboard");
    }
  }, [userId, isLoaded, router]);

  if (!mounted || !isLoaded || userId) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f08_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f08_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Gradient orbs */}
      <div className="absolute left-1/4 top-20 h-96 w-96 rounded-full bg-blue-500/20 blur-[128px]" />
      <div className="absolute bottom-20 right-1/4 h-96 w-96 rounded-full bg-purple-500/20 blur-[128px]" />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-slate-800/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-12">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 shadow-lg ring-1 ring-white/10">
              <Image
                src="/repozy_logo_main.png"
                alt="Repozy Logo"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
            <span className="hidden bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-2xl font-bold text-transparent sm:block">
              Repozy
            </span>
          </Link>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Star on GitHub button */}
            <a
              href="https://github.com/mdkamran04/Repozy"
              target="_blank"
              rel="noopener noreferrer"
              className="group hidden sm:block"
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-slate-700 bg-slate-900/50 text-slate-300 backdrop-blur-sm transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white"
              >
                <Star className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:fill-yellow-400 group-hover:text-yellow-400" />
                <span className="font-medium">Star</span>
              </Button>
            </a>

            {/* GitHub icon for mobile */}
            <a
              href="https://github.com/mdkamran04/Repozy"
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden"
            >
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Github className="h-5 w-5" />
              </Button>
            </a>

            {/* Sign In button */}
            <Link href="/sign-in">
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 hover:shadow-blue-500/30"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 py-20 sm:px-12 sm:py-32">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="mb-8 flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-4 py-2 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-slate-300">
              AI-Powered Repository Intelligence
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="mb-6 max-w-4xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl md:text-7xl">
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Transform Your Code
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Into Intelligence
            </span>
          </h1>

          {/* Subheading */}
          <p className="mb-12 max-w-2xl text-lg text-slate-400 sm:text-xl">
            Unlock the power of AI to understand, analyze, and navigate your
            repositories. Ask questions, get insights, and boost your
            development workflow.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-base font-semibold text-white shadow-lg shadow-blue-500/50 transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/50"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <a
              href="https://github.com/mdkamran04/Repozy"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                variant="outline"
                className="group rounded-xl border-slate-700 bg-slate-900/50 px-8 py-6 text-base font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-slate-600 hover:bg-slate-800"
              >
                <Github className="mr-2 h-5 w-5" />
                View on GitHub
              </Button>
            </a>
          </div>

          {/* Features Grid */}
          <div className="mt-32 grid w-full max-w-5xl gap-6 sm:grid-cols-3">
            {/* Feature 1 */}
            <div className="group rounded-2xl border border-slate-800/50 bg-slate-900/30 p-8 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900/50">
              <div className="mb-4 inline-flex rounded-xl bg-blue-500/10 p-3">
                <Zap className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Lightning Fast
              </h3>
              <p className="text-slate-400">
                Instantly index and search through millions of lines of code
                with AI-powered semantic search.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-2xl border border-slate-800/50 bg-slate-900/30 p-8 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900/50">
              <div className="mb-4 inline-flex rounded-xl bg-purple-500/10 p-3">
                <Sparkles className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                AI-Powered Insights
              </h3>
              <p className="text-slate-400">
                Ask questions about your codebase and get intelligent answers
                powered by advanced AI models.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-2xl border border-slate-800/50 bg-slate-900/30 p-8 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900/50">
              <div className="mb-4 inline-flex rounded-xl bg-green-500/10 p-3">
                <Shield className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Secure & Private
              </h3>
              <p className="text-slate-400">
                Your code stays safe with enterprise-grade security and
                encryption. Full control over your data.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/50 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-slate-500 sm:px-12">
          © 2026 Repozy. Built with passion for developers.
        </div>
      </footer>
    </div>
  );
}
