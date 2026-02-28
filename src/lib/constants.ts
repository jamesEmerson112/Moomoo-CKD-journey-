export const APP_DISCLAIMER =
  "Informational only. This dashboard does not provide medical advice.";

/* ── NLP extraction tuning ────────────────────────────────── */

/** Tokens before a match to scan for negation words (e.g. "no", "not") */
export const NLP_NEGATION_WINDOW = 3;

/** Characters before the matched phrase to include in evidence snippet */
export const NLP_SNIPPET_BEFORE_CHARS = 40;

/** Characters after the matched phrase to include in evidence snippet */
export const NLP_SNIPPET_AFTER_CHARS = 100;

/** Max snippet length when the phrase token is not found in the original text */
export const NLP_SNIPPET_FALLBACK_LENGTH = 140;

/** Longest multi-word phrase length to scan during NLP matching */
export const NLP_MAX_PHRASE_TOKENS = 3;

/* ── Hybrid alert thresholds ──────────────────────────────── */

/** Weighted score at or above which a vomiting spike alert fires */
export const VOMITING_SPIKE_SCORE_THRESHOLD = 3;

/** Mention count at or above which a vomiting spike alert fires */
export const VOMITING_SPIKE_COUNT_THRESHOLD = 2;

/** Weighted score at or above which an appetite crisis alert fires */
export const APPETITE_CRISIS_SCORE_THRESHOLD = 2.3;
