export interface Testimonial {
  quote: string;
  name: string;
  role?: string;
  company?: string;
  country?: string;
  /** Catalogue service id the work was for, e.g. 'apps'. */
  service?: string;
  /** ISO date of the feedback, e.g. '2025-03-14'. */
  date?: string;
  source: 'upwork' | 'direct';
  sourceUrl?: string;
}

/**
 * Real client feedback only, transcribed verbatim (Upwork reviews or direct
 * messages the client has agreed to share). Never write, paraphrase or
 * improve a quote. Use first name + initial and country unless the client
 * has cleared full attribution. The section renders only with two or more.
 */
export const TESTIMONIALS: Testimonial[] = [];
