/** Length limits for a journal draft. The single source for the topic validator, prompt, shape check and lint. */
export const LIMITS = {
  minWords: 400,
  maxWords: 700,
  title: 90,
  summary: 160,
  minTags: 1,
  maxTags: 5,
  captions: { linkedin: 280, x: 280, whatsapp: 400 },
} as const;
