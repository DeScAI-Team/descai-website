export type ReviewSection = {
  rationale?: string;
  review_statement?: string;
  replication_caveats?: string;
  discipline_caveats?: string;
  conflict_of_interest?: boolean;
  [key: string]: unknown;
};

export type ReviewListItem = {
  id: string | number;
  created_at: string;
  title: string | null;
  paper_id: string | null;
};

export type Review = ReviewListItem & {
  originality_review?: ReviewSection | null;
  clarity_review?: ReviewSection | null;
  rigor_reproducibility_review?: ReviewSection | null;
  data_transparency_review?: ReviewSection | null;
  interpretation_ethics_review?: ReviewSection | null;

  originality_score?: number | null;
  clarity_score?: number | null;
  rigor_score?: number | null;
  reproducibility_score?: number | null;
  data_transparency_score?: number | null;
  interpretation_congruence_score?: number | null;
  field_familiarity_score?: number | null;
};
