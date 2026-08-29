"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
      });
      router.push("/login");
    } catch {
      toast.error("Gagal keluar");
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
      Keluar
    </Button>
  );
}
