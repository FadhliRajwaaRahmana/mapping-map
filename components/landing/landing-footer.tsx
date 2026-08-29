export function LandingFooter() {
  return (
    <footer className="border-t py-8">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Mapping. Dibuat dengan Next.js.
      </div>
    </footer>
  );
}
