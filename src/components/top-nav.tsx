import Link from "next/link";

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/15 bg-slate-950/70 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-display text-lg font-semibold tracking-wide text-teal-200">
            Momoo Journey Monitor
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-slate-200 sm:flex">
            <Link href="/#status" className="hover:text-teal-200">
              Status
            </Link>
            <Link href="/#issues" className="hover:text-teal-200">
              Issues
            </Link>
            <Link href="/#events" className="hover:text-teal-200">
              Events
            </Link>
            <Link href="/#timeline" className="hover:text-teal-200">
              Timeline
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
