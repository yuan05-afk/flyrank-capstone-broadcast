import { PLATFORM_BRAND, isPlatformKey } from "@/config/platform-brand";

export function PlatformIcon({
  platform,
  className = "w-4 h-4",
  branded = true,
  title,
}: {
  platform: string;
  className?: string;
  branded?: boolean;
  title?: string;
}) {
  if (!isPlatformKey(platform)) return null;
  const brand = PLATFORM_BRAND[platform];

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      style={branded ? { color: brand.color } : undefined}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <path d={brand.path} />
    </svg>
  );
}
