import React from 'react';
import { render, screen } from '@testing-library/react';
import AnimatedDreamGrid from '@/components/AnimatedDreamGrid';
import { SearchProvider } from '@/context/search-context';

// Stub DreamCard so this stays a test of the grid's own filtering rather than
// of the card's internals.
//
// This previously mocked next/dynamic, which stopped having any effect when
// AnimatedDreamGrid switched to a direct `import DreamCard from './DreamCard'`
// — the grid was dynamic-importing with ssr:false, so the whole journal
// rendered as skeletons until hydration and wrecked LCP (see the note at the
// top of the component). The mock kept passing through a mechanism nothing
// used, so the real card rendered and the testid was never found. Mocking the
// module the component actually imports is what makes this assert anything.
vi.mock('@/components/DreamCard', () => ({
  default: function MockDreamCard({ dream }: any) {
    return (
      <div data-testid={`dream-card-${dream.id}`}>
        <div>{dream.title}</div>
        <div>{dream.original_text}</div>
      </div>
    );
  },
}));

describe('AnimatedDreamGrid Filtering', () => {
  const mockDreams = [
    {
      id: '1',
      original_text: 'I was flying over mountains',
      title: 'Flying Dream',
      tags: ['flying', 'mountain'],
      created_at: '2023-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      original_text: 'I was swimming in the ocean',
      title: 'Ocean Dream',
      tags: ['water', 'ocean'],
      created_at: '2023-01-02T00:00:00.000Z',
    },
    {
      id: '3',
      original_text: 'I was running in a forest',
      title: 'Forest Dream',
      tags: ['forest', 'running'],
      created_at: '2023-01-03T00:00:00.000Z',
    },
  ];

  it('should render all dreams by default', () => {
    render(<SearchProvider><AnimatedDreamGrid dreams={mockDreams} /></SearchProvider>);
    
    // Check that all dreams are rendered
    mockDreams.forEach(dream => {
      expect(screen.getByTestId(`dream-card-${dream.id}`)).toBeInTheDocument();
    });
  });
  
  it('should render placeholder when no dreams are provided', () => {
    render(<SearchProvider><AnimatedDreamGrid dreams={[]} /></SearchProvider>);

    // Asserts on what the reader actually sees rather than a
    // data-testid="dream-card-placeholder" that the component has never had —
    // this test could only ever have failed. Querying the heading also means
    // the empty state can be restyled freely and only breaks here if the
    // message itself goes missing.
    expect(
      screen.getByRole('heading', { name: /no dreams recorded yet/i }),
    ).toBeInTheDocument();
  });
  
  // Will be added after implementing filtering
  it.todo('should filter dreams based on search term');
});