/** Rendered variants are served through the app, never from disk directly. */
export function mediaUrl(imagePath: string): string {
  const cleaned = imagePath.replace(/^storage\/variants\//, "");
  return `/api/media/${cleaned}`;
}
