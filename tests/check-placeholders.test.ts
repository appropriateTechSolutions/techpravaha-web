// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findPlaceholders, readableText } from '../scripts/check-placeholders';

describe('check-placeholders', () => {
  it('reads text and readable attributes, not scripts, styles or class names', () => {
    const html =
      '<html><head><meta name="description" content="Built in [timeline pending]"><style>a[href]{}</style></head>' +
      '<body class="grid-cols-[minmax(0,1fr)_minmax(0,420px)]"><p>GSTIN: [GSTIN]</p><img alt="[screenshot pending]">' +
      '<script>x[restoreKey || window.history.state.key]=1</script></body></html>';
    const text = readableText(html);
    expect(text).toContain('[GSTIN]');
    expect(text).toContain('[timeline pending]');
    expect(text).toContain('[screenshot pending]');
    expect(text).not.toContain('minmax');
    expect(text).not.toContain('restoreKey');
    expect(text).not.toContain('a[href]');
  });

  it('lists file:match for HTML and SVG files, once per file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'placeholders-'));
    mkdirSync(join(dir, 'terms'));
    mkdirSync(join(dir, 'work'));
    writeFileSync(join(dir, 'terms/index.html'), '<p>[GSTIN] and [GSTIN] at [registered address]</p><p>[ok] [1] [x]</p>');
    writeFileSync(join(dir, 'work/1.svg'), '<svg><text>[screenshot pending]</text></svg>');
    writeFileSync(join(dir, 'clean.html'), '<p>No placeholders here.</p>');
    expect(findPlaceholders(dir)).toEqual([
      'terms/index.html:[GSTIN]',
      'terms/index.html:[registered address]',
      'work/1.svg:[screenshot pending]',
    ]);
  });

  it('skips the hosted products, whose copy is built in their own repos', () => {
    const dir = mkdtempSync(join(tmpdir(), 'placeholders-'));
    mkdirSync(join(dir, 'homefind'));
    mkdirSync(join(dir, 'lab'));
    writeFileSync(join(dir, 'homefind/index.html'), '<p>[Kitchen drawer]</p>');
    writeFileSync(join(dir, 'lab/index.html'), '<p>[Kitchen drawer]</p>');
    expect(findPlaceholders(dir)).toEqual(['lab/index.html:[Kitchen drawer]']);
  });
});
