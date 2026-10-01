"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    void getCurrentUser()
      .then((user) => {
        router.replace(user.isPlatformAdmin ? "/admin" : "/login");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
      Memeriksa sesi Platform Admin...
    </main>
  );
}
