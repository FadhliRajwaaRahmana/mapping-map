import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      {/* Background grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:64px_64px] opacity-30" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-foreground bg-primary font-heading text-sm font-bold text-primary-foreground shadow-brutal-sm">
              M
            </div>
            <span className="font-heading text-xl font-bold tracking-tight">
              Mapping
            </span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
