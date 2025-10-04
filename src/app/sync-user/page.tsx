import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { auth, clerkClient } from "@clerk/nextjs/server";
import useRefetch from "@/hooks/use-refetch";

export default async function SyncUser() {
  console.log("SyncUser: start");
  const refetch = useRefetch();

  const { userId } = await auth();
  console.log("SyncUser: auth() returned userId:", userId);

  if (!userId) {
    console.warn("SyncUser: no userId -> redirect to sign-in");
    return redirect("/sign-in");
  }

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);

    const email = user.emailAddresses?.[0]?.emailAddress;

    if (!email) {
      console.error("SyncUser: no email -> redirect to sign-in");
      return redirect("/sign-in");
    }

    const result = await db.user.upsert({
      where: { emailAddress: email },
      update: {
        imageUrl: user.imageUrl ?? "",
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        // Do NOT update credits here to preserve any remaining balance
        isSynced: true,
      },
      create: {
        id: userId,
        emailAddress: email,
        imageUrl: user.imageUrl ?? "",
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",

        credits: 150,
        isSynced: true,
      },
    });
    console.log("SyncUser: upsert result:", result);

    return redirect("/dashboard");
    refetch();
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof err.digest === "string" &&
      err.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    console.error("SyncUser: unexpected error during upsert:", err);

    return redirect("/sign-in");
  }
}
