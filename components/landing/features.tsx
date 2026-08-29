import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  { title: "Kanvas tak terbatas", body: "Taruh node di mana saja. Bebas menggambar, menghubungkan, dan menata seperti papan putih." },
  { title: "Klik node → detail Markdown", body: "Setiap node menyimpan catatan Markdown lengkap — heading, tabel, blok kode, list." },
  { title: "Kolaborasi real-time", body: "Undang rekan, dan lihat perubahan mereka muncul dalam hitungan detik." },
  { title: "Semua tersimpan otomatis", body: "Tanpa tombol simpan. Peta dan catatanmu tersimpan di cloud." },
];

export function Features() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <CardContent className="pt-6">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <Button asChild size="lg">
          <Link href="/register">Mulai sekarang — gratis</Link>
        </Button>
      </div>
    </section>
  );
}
