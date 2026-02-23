import { SidebarProvider } from "@/components/ui/sidebar";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";
import { AppSidebar } from "./app-sidebar";
import { db } from "@/server/db";

type Props = {
  children: React.ReactNode;
};

const SidebarLayout = async ({ children }: Props) => {
  const { userId } = await auth();
  
  if (!userId) {
    return redirect("/sign-in");
  }

  // Check if user exists in database and is synced
  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, isSynced: true }
  });

  // If user doesn't exist or isn't synced, redirect to sync-user
  if (!dbUser || !dbUser.isSynced) {
    return redirect("/sync-user");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="m-2 w-full">
        <div className="item-center flex gap-2 rounded-md border border-sidebar-border p-2 px-4 shadow">
          {/* <SearchBar/> */}
          <div className="ml-auto"></div>
          <UserButton />
        </div>
        <div className="h-4"></div>
        {/* main content */}
        <div className="h-[calc(100vh-6rem)] overflow-y-scroll rounded-md border border-sidebar-border bg-sidebar p-4 shadow">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
};

export default SidebarLayout;
