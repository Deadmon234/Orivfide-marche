import Image from "next/image";

type OrivfideLogoProps = {
  variant?: "light" | "dark";
  size?: "standard" | "large";
  className?: string;
};

export function OrivfideLogo({
  variant = "dark",
  size = "standard",
  className = "",
}: OrivfideLogoProps) {
  return (
    <div className={className}>
      <Image
        src="/orivfide-logo.png"
        alt="ORIVFIDE"
        width={188}
        height={53}
        priority={size === "large"}
        className={`h-auto object-contain ${size === "large" ? "w-72" : "w-40"} ${
          variant === "light" ? "brightness-0 invert" : ""
        }`}
      />
    </div>
  );
}
