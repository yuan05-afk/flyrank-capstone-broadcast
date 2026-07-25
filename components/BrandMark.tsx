import Link from "next/link";
import type { MouseEventHandler } from "react";

/** Crop frame + live corner - Broadcast mark. */
export function BrandMark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#101828" />
      <rect
        x="14"
        y="14"
        width="36"
        height="36"
        rx="8"
        stroke="#F7F8FC"
        strokeWidth="4"
      />
      <circle cx="50" cy="14" r="5.25" fill="#101828" />
      <circle cx="50" cy="14" r="3.75" fill="#E11D48" />
    </svg>
  );
}

export function BrandLockup({
  href = "/",
  size = 28,
  onClick,
}: {
  href?: string;
  size?: number;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const className =
    "inline-flex items-center gap-2.5 transition-opacity hover:opacity-80";
  const contents = (
    <>
      <BrandMark size={size} />
      <span className="font-display font-semibold text-ink tracking-tight text-[1.05rem]">
        Broadcast
      </span>
    </>
  );

  if (onClick) {
    return (
      <a href={href} onClick={onClick} className={className} aria-label="Broadcast">
        {contents}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {contents}
    </Link>
  );
}
