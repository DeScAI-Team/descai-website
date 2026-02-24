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
};
