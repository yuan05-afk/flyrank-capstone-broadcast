/**
 * Remounts on every navigation (App Router template), which re-fires the
 * CSS enter animation without exit delays that would make pages feel slower.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="bc-page-enter">{children}</div>;
}
