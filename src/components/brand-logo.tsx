import Image from "next/image";
import styles from "./brand-logo.module.css";

type BrandLogoProps = {
  size?: number;
  tone?: "dark" | "light";
  alt?: string;
  className?: string;
};

export function BrandLogo({
  size = 48,
  tone = "dark",
  alt = "UNDERY",
  className,
}: BrandLogoProps) {
  return (
    <Image
      src="/images/brand/undery-mark.png"
      alt={alt}
      width={size}
      height={size}
      className={[styles.logo, styles[tone], className]
        .filter(Boolean)
        .join(" ")}
      loading="eager"
      unoptimized
    />
  );
}
