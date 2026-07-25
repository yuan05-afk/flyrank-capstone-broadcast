import { buildAllVariants } from "../lib/images/variants";

async function main() {
  const out = await buildAllVariants("preview-check", ["instagram", "x"], {
    title: "Why safe-zone crops matter for social campaigns",
    body: "A single master image rarely survives every platform.",
    url: "https://example.com/blog/safe-zone-crops",
  });
  console.log(out);
}

void main();
