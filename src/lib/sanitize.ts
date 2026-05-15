/** Trim and collapse internal whitespace runs to a single space. */
export const sanitizeText = (val: string): string =>
  val.trim().replace(/\s+/g, ' ');

/** Trim and lowercase — use for email addresses. */
export const sanitizeEmail = (val: string): string =>
  val.trim().toLowerCase();

/** Trim only — preserves internal newlines and formatting in textareas. */
export const sanitizeMultiline = (val: string): string =>
  val.trim();

/** Returns true when val is a plausible email address. */
export const isValidEmail = (val: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
