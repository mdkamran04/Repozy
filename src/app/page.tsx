"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (userId) {
      // auto-redirect after short delay
      const t = setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
      return () => clearTimeout(t);
    } else {
      router.push("/sign-in");
    }
  }, [userId, router]);

  if (!userId) {
    return null; // while redirecting to sign-in
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50">
      {/* Spinner */}
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />

      {/* Text */}
      <p className="text-lg text-gray-700">Redirecting you to your dashboard...</p>

      {/* Fallback Button */}
      <Button
        onClick={() => router.push("/dashboard")}
        className="mt-4 rounded-lg px-4 py-2"
      >
        Go to Dashboard
      </Button>
    </div>
  );
}
