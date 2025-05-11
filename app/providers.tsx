'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';
import { SearchProvider } from '@/context/search-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SearchProvider>
        {children}
      </SearchProvider>
    </ThemeProvider>
  );
}