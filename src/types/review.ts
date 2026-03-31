/**Categories (originality, tokenomics_governance, etc.) */
export type ReviewSection = {
  [key: string]: unknown;
};

/** A single dynamic category from the Arweave JSON */
export type ReviewCategory = {
  key: string;
  label: string;
  score: number | null;
  section: ReviewSection | null;
};

/** A general-info section (key_strengths, areas_for_improvement, or any future field) */
export type ReviewInfoSection = {
  key: string;
  /*Human readable label*/
  label: string;
  content: ReviewSection;
};

/**Identifer information for a Review */
export type ReviewListItem = {
  id: string | number;
  created_at: string;
  title: string | null;
  paper_id: string | null;
};

/**Dynamically Sized Review that contains specific catogeries, an average score, and general info about an entry. */
export type Review = ReviewListItem & {
  categories?: ReviewCategory[];
  average_score?: number | null;
  info?: ReviewInfoSection[];
  originality_score?: number | null;
  clarity_score?: number | null;
  rigor_score?: number | null;
  reproducibility_score?: number | null;
  data_transparency_score?: number | null;
  interpretation_congruence_score?: number | null;
  field_familiarity_score?: number | null;
  originality_review?: ReviewSection | null;
  clarity_review?: ReviewSection | null;
  rigor_reproducibility_review?: ReviewSection | null;
  data_transparency_review?: ReviewSection | null;
  interpretation_ethics_review?: ReviewSection | null;
};
