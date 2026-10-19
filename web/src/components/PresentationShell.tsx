import { OrivfideLogo } from "./OrivfideLogo";
import { RevealOnScroll } from "./RevealOnScroll";

type PresentationShellProps = {
  id?: string;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
};

export function PresentationShell({
  id,
  children,
  className = "",
  dark = false,
}: PresentationShellProps) {
  return (
    <section
      id={id}
      className={`relative flex min-h-screen flex-col px-6 py-16 md:px-12 lg:px-20 ${className}`}
    >
      <RevealOnScroll className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
        {children}
      </RevealOnScroll>
      <footer
        className={`mx-auto mt-12 flex w-full max-w-6xl items-end justify-between border-t pt-6 text-sm ${
          dark ? "border-white/10 text-white/60" : "border-black/5 text-orivfide-muted"
        }`}
      >
        <div>
          <OrivfideLogo variant={dark ? "light" : "dark"} />
          <p className="mt-1 text-xs">ORIVFIDE — Présentation du projet</p>
        </div>
      </footer>
    </section>
  );
}
