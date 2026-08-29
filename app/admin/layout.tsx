import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/guards";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const check = await requireSuperAdmin();
  if (!check.ok) redirect("/login");

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar userName={check.user.name} userEmail={check.user.email} />
      <div className="flex flex-1 flex-col md:ml-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b-2 border-foreground bg-card px-4 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <span className="font-heading text-sm font-bold">Admin</span>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <span className="rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-destructive-foreground">SUPERADMIN</span>
            <span className="text-sm font-medium">{check.user.name}</span>
            <span className="text-xs text-muted-foreground">{check.user.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/maps" className="rounded-md border-2 border-foreground/20 px-3 py-1.5 text-xs font-semibold hover:border-foreground hover:shadow-brutal-sm">
              ← Kembali ke App
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
