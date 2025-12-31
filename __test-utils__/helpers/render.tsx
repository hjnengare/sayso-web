/**
 * Custom render function with providers for testing
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { ToastProvider } from '@/app/contexts/ToastContext';

interface AllTheProvidersProps {
  children: React.ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // authValue is not supported as AuthProvider doesn't accept a value prop
  // Auth state is managed internally by AuthProvider
}

export function renderWithProviders(
  ui: ReactElement,
  { ...renderOptions }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AllTheProviders>
        {children}
      </AllTheProviders>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything
export * from '@testing-library/react';

