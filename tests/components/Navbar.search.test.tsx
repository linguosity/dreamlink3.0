import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '@/components/Navbar';
import { SearchProvider } from '@/context/search-context';

// Mock the UserAvatar component since we're only testing search functionality.
// This said `jest.mock` — a leftover from the Jest era that threw
// "jest is not defined" at import time, so the whole file collected as zero
// tests and reported as one failing suite rather than two failing tests.
// Vitest also requires the mocked module's shape, hence the { default: ... }.
vi.mock('@/components/UserAvatar', () => ({
  default: function MockUserAvatar() {
    return <div data-testid="mock-user-avatar">UserAvatar</div>;
  },
}));

// Navbar calls useSearch(), which throws outside its provider.
function renderNavbar() {
  return render(
    <SearchProvider>
      <Navbar />
    </SearchProvider>,
  );
}

// These assertions used to look for a button named /search dreams/i that opened
// a dropdown containing an input placeheld "Search dream entries". No such
// control exists — the navbar now renders the search field inline, labelled
// "Search dreams" and placeheld "Search...", and typed terms become removable
// keyword chips. The tests described an older navbar and could not have passed
// against this one.
describe('Navbar Search Functionality', () => {
  it('should render the search input', () => {
    renderNavbar();

    const searchInput = screen.getByRole('textbox', { name: /search dreams/i });
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Search...');
  });

  it('should handle search input changes without affecting other UI', () => {
    renderNavbar();

    const searchInput = screen.getByRole('textbox', { name: /search dreams/i });
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    expect(searchInput).toHaveValue('test search');

    // The rest of the navbar is undisturbed by typing.
    expect(screen.getByTestId('mock-user-avatar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dreamriver/i })).toBeInTheDocument();
  });

  it('should turn a committed term into a removable keyword chip', () => {
    renderNavbar();

    const searchInput = screen.getByRole('textbox', { name: /search dreams/i });
    fireEvent.change(searchInput, { target: { value: 'flying' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    // Committing a term clears the field and offers a way to undo it — the
    // placeholder flips to "Add..." once at least one keyword is active.
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Add...');
  });
});
