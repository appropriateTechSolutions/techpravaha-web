import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JsonLd } from '../app/components/ui/JsonLd';

describe('JsonLd', () => {
  it('renders an ld+json script with the serialised data', () => {
    const { container } = render(<JsonLd data={{ '@type': 'Thing', name: 'x</script>' }} />);
    const s = container.querySelector('script[type="application/ld+json"]')!;
    expect(s).toBeTruthy();
    const text = s.textContent!;
    expect(text).not.toContain('</script>');
    expect(JSON.parse(text)).toEqual({ '@type': 'Thing', name: 'x</script>' });
  });
});
