import sharp from "sharp";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFE4E8"/>
      <stop offset="100%" stop-color="#F7F8FC"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="80" y="120" width="520" height="660" rx="36" fill="#ffffff" stroke="#E4E7EC"/>
  <rect x="120" y="180" width="440" height="440" rx="24" fill="#101828"/>
  <circle cx="500" cy="220" r="16" fill="#E11D48"/>
  <rect x="1000" y="160" width="520" height="300" rx="28" fill="#101828"/>
  <circle cx="1480" cy="200" r="18" fill="#E11D48"/>
  <rect x="1040" y="220" width="300" height="24" rx="8" fill="#F7F8FC" opacity=".35"/>
  <rect x="1040" y="270" width="240" height="16" rx="6" fill="#F7F8FC" opacity=".25"/>
  <rect x="1000" y="500" width="520" height="220" rx="28" fill="#ffffff" stroke="#E4E7EC"/>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile("public/broadcast-hero.png");
console.log("hero written");
