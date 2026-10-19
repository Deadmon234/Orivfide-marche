import type { LucideIcon } from "lucide-react";

type SectionHeaderProps = {
  label: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  dark?: boolean;
};

export function SectionHeader({
  label,
  title,
  description,
  icon: Icon,
  dark = false,
}: SectionHeaderProps) {
  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-3xl">
        <p
          className={`mb-3 text-xs font-semibold uppercase tracking-[0.25em] ${
            dark ? "text-white/70" : "text-orivfide-red"
          }`}
        >
          {label}
        </p>
        <h2
          className={`font-serif text-3xl font-bold leading-tight md:text-4xl ${
            dark ? "text-white" : "text-foreground"
          }`}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={`mt-4 text-base leading-relaxed md:text-lg ${
              dark ? "text-white/80" : "text-orivfide-muted"
            }`}
          >
            {description}
          </p>
        ) : null}
      </div>
      {Icon ? (
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
            dark ? "bg-white/15 text-white" : "bg-orivfide-red text-white"
          }`}
        >
          <Icon className="h-7 w-7" strokeWidth={1.75} />
        </div>
      ) : null}
    </div>
  );
}
