export type ReviewVisualAsset = {
  id: string;
  src: string;
  keywords: string[];
  platforms?: string[];
  categories?: string[];
  categoryKeys?: string[];
  /** Platform/category fallback tiles score lower than domain matches. */
  isDefault?: boolean;
};

export const REVIEW_VISUAL_LIBRARY: ReviewVisualAsset[] = [
  {
    id: "molecule-default",
    src: "/review-visuals/molecule-default.jpg",
    keywords: ["molecule", "ipt", "ipnft", "biodao", "biotech", "funding"],
    platforms: ["molecule"],
    categories: ["researchdao"],
    isDefault: true
  },
  {
    id: "researchhub-default",
    src: "/review-visuals/researchhub-default.jpg",
    keywords: ["researchhub", "preprint", "publication", "peer", "manuscript", "paper"],
    platforms: ["researchhub"],
    isDefault: true
  },
  {
    id: "generic-desci",
    src: "/review-visuals/generic-desci.jpg",
    keywords: ["desci", "decentralized", "open"],
    isDefault: true
  },
  {
    id: "longevity",
    src: "/review-visuals/longevity.jpg",
    keywords: [
      "longevity",
      "aging",
      "ageing",
      "senescence",
      "lifespan",
      "healthspan",
      "vitadao",
      "geroscience",
      "antiaging",
      "anti-aging",
      "matrix",
      "artan",
      "vitamity",
      "ovaria",
      "donna"
    ]
  },
  {
    id: "neuroscience",
    src: "/review-visuals/neuroscience.jpg",
    keywords: [
      "neuro",
      "neurology",
      "neuromuscular",
      "brain",
      "cognitive",
      "alzheimer",
      "parkinson",
      "synapse",
      "neural",
      "standing",
      "nate"
    ]
  },
  {
    id: "oncology",
    src: "/review-visuals/oncology.jpg",
    keywords: ["cancer", "oncology", "tumor", "tumour", "carcinoma", "chemotherapy", "immuno-oncology", "heal"]
  },
  {
    id: "immunology",
    src: "/review-visuals/immunology.jpg",
    keywords: ["immune", "immunology", "antibody", "vaccine", "inflammation", "autoimmune", "cytokine", "defense"]
  },
  {
    id: "genetics",
    src: "/review-visuals/genetics.jpg",
    keywords: [
      "gene",
      "genetic",
      "genomics",
      "dna",
      "rna",
      "crispr",
      "sequencing",
      "transcriptomic",
      "mutation",
      "codon",
      "nonsense",
      "suppression",
      "forge"
    ]
  },
  {
    id: "synthetic-biology",
    src: "/review-visuals/synthetic-biology.jpg",
    keywords: ["synthetic", "bioengineering", "engineered", "construct", "plasmid", "biosynthesis", "peptide", "motsc"]
  },
  {
    id: "autophagy",
    src: "/review-visuals/autophagy.jpg",
    keywords: ["autophagy", "lysosome", "recycling", "korolchuk", "clearance", "activator", "activators"]
  },
  {
    id: "metabolic",
    src: "/review-visuals/metabolic.jpg",
    keywords: [
      "metabolic",
      "metabolism",
      "diabetes",
      "metformin",
      "glucose",
      "insulin",
      "obesity",
      "mitochondria",
      "ferm",
      "vitality",
      "kp10",
      "kp13"
    ]
  },
  {
    id: "dermatology",
    src: "/review-visuals/dermatology.jpg",
    keywords: ["skin", "dermatology", "topical", "wound", "vitastem", "vitarat", "skin783", "epidermal", "cosmetic"]
  },
  {
    id: "agriculture",
    src: "/review-visuals/agriculture.jpg",
    keywords: [
      "agriculture",
      "hemp",
      "cannabis",
      "crop",
      "grow",
      "plant",
      "botanical",
      "farming",
      "hempy",
      "grow-oil",
      "cbd",
      "psilocin"
    ]
  },
  {
    id: "lab-research",
    src: "/review-visuals/lab-research.jpg",
    keywords: [
      "laboratory",
      "experiment",
      "bench",
      "microscope",
      "pipette",
      "protocol",
      "reproducibility",
      "filter",
      "uro",
      "vitafoxo"
    ],
    categoryKeys: ["research_output_quality", "scientific_grounding", "execution_competence"]
  },
  {
    id: "clinical-trial",
    src: "/review-visuals/clinical-trial.jpg",
    keywords: ["clinical", "trial", "patient", "therapeutic", "treatment", "efficacy", "safety", "phase", "hospital"]
  },
  {
    id: "tokenomics-governance",
    src: "/review-visuals/tokenomics-governance.jpg",
    keywords: ["tokenomics", "governance", "treasury", "staking", "economics", "incentive", "voting"],
    categoryKeys: ["tokenomics_governance"]
  }
];

export const PLATFORM_DEFAULT_ASSETS: Record<string, string> = {
  molecule: "/review-visuals/molecule-default.jpg",
  researchhub: "/review-visuals/researchhub-default.jpg"
};

export const GENERIC_DEFAULT_ASSET = "/review-visuals/generic-desci.jpg";
