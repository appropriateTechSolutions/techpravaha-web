/**
 * Characters no visitor text needs. Shared base: DEL, C1 controls, soft hyphen, Arabic letter mark,
 * zero-width and directional marks, Unicode line/paragraph separators, bidi overrides and isolates,
 * word joiner and the BOM: the raw material of header injection and of text that reads differently
 * from what it is.
 */
const BASE = '\\u007f-\\u009f\\u00ad\\u061c\\u200b\\u200e\\u200f\\u2028-\\u202e\\u2060\\u2066-\\u2069\\ufeff';

/**
 * Single-line fields (names, emails, phones): every C0 control plus BASE, plus the zero-width
 * non-joiner and joiner.
 */
export const CONTROL_RE = new RegExp(`[\\u0000-\\u001f\\u200c\\u200d${BASE}]`);

/**
 * Free text such as chat messages: as CONTROL_RE, but tab, newline and carriage return are allowed,
 * and so are the zero-width non-joiner and joiner (U+200C, U+200D), which Indic scripts and emoji
 * sequences use.
 */
export const TEXT_CONTROL_RE = new RegExp(`[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f${BASE}]`);
