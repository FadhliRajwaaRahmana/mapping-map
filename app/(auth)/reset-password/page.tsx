import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ResetPasswordPage({
  searchParams: sp,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await sp;
  const token = params.token as string | undefined;
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Reset kata sandi</h1>
      {token ? (
        <p>Fitur reset via email belum diaktifkan di lingkungan ini. Hubungi admin.</p>
      ) : (
        <p>Link reset tidak valid atau tidak ditemukan.</p>
      )}
      <Button asChild>
        <Link href="/login">Kembali ke halaman masuk</Link>
      </Button>
    </div>
  );
}
