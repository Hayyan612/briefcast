import { connection } from "next/server";
import { Suspense } from "react";

import { auth, signOut } from "@/auth";
import { Brand } from "@/components/brand";
import { UserMenu } from "@/components/user-menu";
import { Skeleton } from "@/components/ui/skeleton";

async function HeaderUser() {
  await connection(); // session reads are request-time; never prerender them
  const session = await auth();
  if (!session?.user) return null;
  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }
  return (
    <UserMenu
      name={session.user.name}
      email={session.user.email}
      image={session.user.image}
      signOutAction={signOutAction}
    />
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Brand />
        <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
          <HeaderUser />
        </Suspense>
      </div>
    </header>
  );
}
