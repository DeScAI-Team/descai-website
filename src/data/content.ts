export const platformGroups = [
  {
    title: "Molecule",
    items: [">VITFAST", ">EDMT", ">AUBRAI", ">RIF", ">VITARNA", ">..."]
  },
  {
    title: "Research Hub",
    items: [">The Neuromuscular...", ">Standing On Nate...", ">Nonsurgical Trea...", ">Transcriptomic A...", ">..."]
  },
  {
    title: "Pump.science",
    items: [">$DOCS", ">$OMIGU", ">$OMIDOCS", ">$ART"]
  }
] as const;

export const newsItems = [
  {
    title: "ARTAN Bio - Mutation-Specific Codon Suppression for Aging and Longevity",
    body:
      "ARTAN is a biotechnology company developing first-in-class interventions to tackle the most frequent nonsense mutations implicated in a wide range of age-related...",
    platform: "VitaDAO",
    field: "Longevity",
    publishedAt: "2026-05-15T18:30:00.000Z",
    score: "4:7"
  },
  {
    title: "Discovering Novel Autophagy Activators - Korolchuk Lab",
    body:
      "Autophagy - the mechanism to recycle cellular components - becomes dysregulated with age and is associated with numerous diseases. The Korolchuk Lab, based at Newcastle...",
    platform: "ResearchHub",
    field: "Autophagy",
    publishedAt: "2026-05-15T14:00:00.000Z",
    score: "3:5"
  },
  {
    title: "Matrix Bio - Long-lived Species Inspired Longevity Biotech",
    body:
      "VitaDAO and the Osborne Lab are launching Matrix Bio, a cutting-edge research venture leveraging the anti-cancer...",
    platform: "Molecule",
    field: "Longevity",
    publishedAt: "2026-05-14T09:20:00.000Z",
    score: "5:6"
  }
] as const;

export const featuredRatings = [
  { label: "Originality", value: 70 },
  { label: "Data Transparency", value: 60 },
  { label: "Accuracy", value: 70 },
  { label: "Clarity", value: 68 },
  { label: "Rigor", value: 75 }
] as const;

export const recentFeaturedResearch = [
  { title: "ApoptoSENS", score: "A+" },
  { title: "MicroDAO", score: "A" },
  { title: "Nonsurgical Trea...", score: "B+" },
  { title: "Transcriptomic A...", score: "B+" },
  { title: "SRULI", score: "B" }
] as const;

export const featuredStandouts = [
  {
    title: "ARTAN Bio",
    score: "A+",
    platform: "VitaDAO",
    date: "11/17/2025"
  },
  {
    title: "Matrix Bio",
    score: "A-",
    platform: "ResearchHub",
    date: "11/16/2025"
  }
] as const;

export const topProjects = [
  { icon: "Λ", grade: "C" },
  { icon: "⚗", grade: "A" },
  { icon: "🧬", grade: "A-" },
  { icon: "☍", grade: "B+" },
  { icon: "✶", grade: "A+" },
  { icon: "∑", grade: "B" }
] as const;

export const projectTokens = [
  { ticker: "$AUBRAI", name: "AubrAI", price: "$7.27", change: "7.96%", trend: "down", chain: "BASE" },
  { ticker: "$VITA", name: "VitaDao", price: "$0.6544", change: "4.24%", trend: "up", chain: "ETH" },
  { ticker: "$BIO", name: "Bio Protocol", price: "$0.07187", change: "6.25%", trend: "down", chain: "ETH" },
  { ticker: "$VITARNA", name: "Artan Bio", price: "$0.623", change: "5.47%", trend: "down", chain: "ETH" },
  { ticker: "$RSC", name: "ResearchCoin", price: "$0.2351", change: "5.8%", trend: "down", chain: "ETH" },
  { ticker: "$RAPTOR", name: "SMER28 - Rapamycin", price: "$0.02245", change: "2%", trend: "up", chain: "SOL" }
] as const;
