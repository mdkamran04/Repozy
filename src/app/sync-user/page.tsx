import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { auth, clerkClient } from "@clerk/nextjs/server";

export default async function SyncUser() {
  console.log("SyncUser: start");

  const { userId } = await auth();
  console.log("SyncUser: auth() returned userId:", userId);

  if (!userId) {
    console.warn("SyncUser: no userId -> redirect to sign-in");
    return redirect("/sign-in");
  }

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    // Clerk user has an array of email addresses, use the primary one
    const email = user.emailAddresses?.[0]?.emailAddress;

    if (!email) {
      console.error("SyncUser: no email -> redirect to sign-in");
      return redirect("/sign-in");
    }

    const result = await db.user.upsert({
      where: { emailAddress: email },
      // Note: The 'update' block deliberately avoids setting 'credits'
      // so we don't accidentally reset a user's balance on re-sync.
      update: {
        imageUrl: user.imageUrl ?? "",
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        isSynced: true, 
      },
      create: {
        id: userId,
        emailAddress: email,
        imageUrl: user.imageUrl ?? "",
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        // 🛑 FIX: Setting credits to 150 to match the intended default
        credits: 150, 
        isSynced: true, // Set the flag to true on creation
      },
    });

    console.log("SyncUser: upsert result:", result);

    // ✅ Redirect after successful sync
    return redirect("/dashboard");

  } catch (err) {
    // FIX: Use the reliable `digest` check for the internal NEXT_REDIRECT signal.
    if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
        // This is the expected redirect signal, so re-throw it silently
        throw err;
    }
    
    // Log all other genuine errors (e.g., database connection issues)
    console.error("SyncUser: unexpected error during upsert:", err);
    
    // If a genuine DB error occurs, redirect to sign-in
    return redirect("/sign-in");
  }
}
