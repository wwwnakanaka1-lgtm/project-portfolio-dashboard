import sharp from "sharp";
import path from "path";

const sizes = [192, 512];
const outputDir = path.join(process.cwd(), "public");

// Create a simple icon with the letter "P" for Portfolio
async function generateIcon(size: number): Promise<void> {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#3B82F6"/>
      <text
        x="50%"
        y="55%"
        font-family="Arial, sans-serif"
        font-size="${size * 0.6}"
        font-weight="bold"
        fill="white"
        text-anchor="middle"
        dominant-baseline="middle"
      >P</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(outputDir, `icon-${size}.png`));

  console.log(`Generated icon-${size}.png`);
}

async function main(): Promise<void> {
  for (const size of sizes) {
    await generateIcon(size);
  }
  console.log("All icons generated successfully!");
}

main().catch(console.error);
