const stripUnsafeChars = (val: string): string =>
  val
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    })
    .join('')
    .replace(/[<>]/g, '');

/** Trim and collapse internal whitespace runs to a single space. */
export const sanitizeText = (val: string): string =>
  stripUnsafeChars(val).trim().replace(/\s+/g, ' ');

/** Trim and lowercase; use for email addresses. */
export const sanitizeEmail = (val: string): string =>
  sanitizeText(val).toLowerCase();

/** Trim while preserving line breaks in textareas. */
export const sanitizeMultiline = (val: string): string =>
  stripUnsafeChars(val)
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/[ \t]+/g, ' '))
    .join('\n')
    .trim();

export const sanitizeUrl = (val: string): string => {
  const clean = sanitizeText(val);
  if (!clean) return '';
  if (/^(https?:|blob:|data:image\/(?:png|jpeg|jpg|webp);base64,)/i.test(clean)) return clean;
  return '';
};

export const isValidEmail = (val: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizeEmail(val));
