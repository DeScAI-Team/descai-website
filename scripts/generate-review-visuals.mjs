import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "review-visuals");

/** Verified Unsplash science/biomedical photos only. */
const CURATED_ASSETS = {
  "molecule-default": {
    photo: "1576086213369-97a306d36557",
    caption: "Biotechnology laboratory research"
  },
  "researchhub-default": {
    photo: "1454165804606-c3d57bc86b40",
    caption: "Academic scientific research"
  },
  "generic-desci": {
    photo: "1526930382372-67bf22c0fce2",
    caption: "Laboratory microscope"
  },
  longevity: {
    photo: "1647083701183-6f66d6b48174",
    caption: "Cellular biology microscopy"
  },
  neuroscience: {
    photo: "1612349317150-e413f6a5b16d",
    caption: "Neuroscience brain imaging"
  },
  oncology: {
    photo: "1594824476967-48c8b964273f",
    caption: "Cancer cell research"
  },
  immunology: {
    photo: "1554475901-4538ddfbccc2",
    caption: "Immunology laboratory"
  },
  genetics: {
    photo: "1647083701153-b511157232ed",
    caption: "Genetics and molecular biology"
  },
  "synthetic-biology": {
    photo: "1582719478250-c89cae4dc85b",
    caption: "Synthetic biology laboratory"
  },
  autophagy: {
    photo: "1639772823907-a716be4bdecc",
    caption: "Cell biology microscope research"
  },
  metabolic: {
    photo: "1572884267966-02340ebc90ac",
    caption: "Metabolic science laboratory"
  },
  dermatology: {
    photo: "1616394584738-fc6e612e71b9",
    caption: "Dermatology and skin science"
  },
  agriculture: {
    photo: "1714844437236-de8ef1c7286f",
    caption: "Plant cell botanical science"
  },
  "lab-research": {
    photo: "1727091506038-5451111dc2fb",
    caption: "Hands-on laboratory experiment"
  },
  "clinical-trial": {
    photo: "1639772823907-a716be4bdecc",
    caption: "Clinical laboratory research"
  },
  "tokenomics-governance": {
    photo: "1551288049-bebda4e38f71",
    caption: "Scientific data analysis"
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const downloadAsset = async (id, { photo, caption }) => {
  const url = `https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=480&h=380&q=82`;
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(outDir, `${id}.jpg`), bytes);
  return { caption };
};

await mkdir(outDir, { recursive: true });

const manifest = {};
for (const [id, meta] of Object.entries(CURATED_ASSETS)) {
  await sleep(250);
  manifest[id] = await downloadAsset(id, meta);
  console.log(`ok ${id}`);
}

const licenseLines = Object.entries(manifest)
  .map(([id, meta]) => `- \`${id}.jpg\` — ${meta.caption} (Unsplash)`)
  .join("\n");

await writeFile(
  path.join(outDir, "README.md"),
  `# Review visual library

Science-themed cover images. Downloaded once from Unsplash (free license).

## Files

${licenseLines}

## Regenerate

\`\`\`bash
node scripts/generate-review-visuals.mjs
\`\`\`
`
);

console.log(`Downloaded ${Object.keys(manifest).length} science visuals`);
