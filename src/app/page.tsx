"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (userId) {
      router.replace("/dashboard");
    } else {
      router.replace("/sign-in");
    }
  }, [userId, isLoaded, router]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (userId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-lg text-gray-700">
          Redirecting you to your dashboard...
        </p>
        <Button
          onClick={() => router.push("/dashboard")}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white shadow-lg hover:bg-blue-700"
        >
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return null;
}
