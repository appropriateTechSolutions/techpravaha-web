import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Faq } from '../app/components/ui/Faq';

const items = [
  { q: 'Is GST included?', a: 'Prices are ex-GST. 18% is added at checkout.' },
  { q: 'Who owns the code?', a: 'You do, along with every account it runs on.' },
];

describe('Faq', () => {
  it('renders a native <details> per item with the question as <summary>', () => {
    const { container } = render(<Faq items={items} />);
    const details = container.querySelectorAll('details');
    expect(details).toHaveLength(2);
    expect(details[0].querySelector('summary')).toHaveTextContent('Is GST included?');
    expect(details[1].querySelector('summary')).toHaveTextContent('Who owns the code?');
    expect(screen.getByText('You do, along with every account it runs on.')).toBeInTheDocument();
  });

  it('emits FAQPage JSON-LD for the same items', () => {
    const { container } = render(<Faq items={items} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.textContent!);
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity).toHaveLength(2);
    expect(data.mainEntity[0]).toMatchObject({
      '@type': 'Question',
      name: 'Is GST included?',
      acceptedAnswer: { '@type': 'Answer', text: 'Prices are ex-GST. 18% is added at checkout.' },
    });
  });
});
