import { describe, expect, it } from 'vitest';
import { EM_DASH_RE, EN_DASH_RE, findSuperlatives, hasEmDash, hasEnDash, SUPERLATIVES, wordCount } from '../scripts/lib/voice';

describe('voice helpers', () => {
  it('keeps the agreed blocklist', () => {
    expect([...SUPERLATIVES]).toEqual([
      'best',
      'world-class',
      'cutting-edge',
      'seamless',
      'seamlessly',
      'leading',
      'fastest',
      'perfect',
      'ultimate',
    ]);
  });

  it('detects em-dashes only', () => {
    expect(hasEmDash('one \u2014 two')).toBe(true);
    expect(EM_DASH_RE.test('a\u2014b')).toBe(true);
    expect(hasEmDash('one, two - three')).toBe(false);
  });

  it('detects en-dashes separately', () => {
    expect(hasEnDash('2' + String.fromCharCode(0x2013) + '4 weeks')).toBe(true);
    expect(EN_DASH_RE.test('a - b')).toBe(false);
    expect(hasEmDash('2' + String.fromCharCode(0x2013) + '4')).toBe(false);
  });

  it('matches "leading" as an adjective, not in "leading to"', () => {
    expect(findSuperlatives('A leading agency.')).toEqual(['leading']);
    expect(findSuperlatives('An industry-leading studio.')).toEqual(['leading']);
    expect(findSuperlatives('Slow pages are leading to lost leads.')).toEqual([]);
    expect(findSuperlatives('Leading  to nothing, then a leading brand.')).toEqual(['leading']);
  });

  it('finds whole-word superlatives, case-insensitive, unique and lower-cased', () => {
    expect(findSuperlatives('The Best and best, a World-Class build.')).toEqual(['best', 'world-class']);
    expect(findSuperlatives('Seamlessly perfect.')).toEqual(['seamlessly', 'perfect']);
    expect(findSuperlatives('bestow a perfectly fine setup')).toEqual([]);
    expect(findSuperlatives('')).toEqual([]);
  });

  it('counts words like the journal reading time does', () => {
    expect(wordCount('One two three')).toBe(3);
    expect(wordCount('## Heading\n\n- a list item, with ₹35,000')).toBe(6);
    expect(wordCount('  -  ## \n')).toBe(0);
  });
});
