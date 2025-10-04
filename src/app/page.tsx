// src/app/page.tsx
"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react"; // Assuming you have lucide-react for icons

export default function Home() {
  const { userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (userId) {
      // ✅ FIX: Redirect authenticated users to the final destination (/dashboard).
      // The initial flow from sign-in will handle the /sync-user redirect once.
      const t = setTimeout(() => {
        router.push("/dashboard"); 
      }, 500);
      return () => clearTimeout(t);
    } else {
      // User is not authenticated, redirect to sign-in page
      router.push("/sign-in");
    }
  }, [userId, router]);

  if (!userId) {
    // Show nothing while unauthenticated user is being redirected to sign-in
    return null;
  }

  // Show a loading state while authenticated user is being redirected to dashboard
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      <p className="text-lg text-gray-700">Redirecting you to your dashboard...</p>
      {/* Fallback button, just in case */}
      <Button 
        onClick={() => router.push("/dashboard")} 
        className="mt-4 rounded-lg px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
      >
        Go to Dashboard
      </Button>
    </div>
  );
}
