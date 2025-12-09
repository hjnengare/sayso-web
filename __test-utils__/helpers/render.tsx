/**
 * Custom render function with providers for testing
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { ToastProvider } from '@/app/contexts/ToastContext';

interface AllTheProvidersProps {
  children: React.ReactNode;
  authValue?: any;
}

function AllTheProviders({ children, authValue }: AllTheProvidersProps) {
  return (
    <AuthProvider value={authValue}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValue?: any;
}

export function renderWithProviders(
  ui: ReactElement,
  { authValue, ...renderOptions }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AllTheProviders authValue={authValue}>
        {children}
      </AllTheProviders>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything
export * from '@testing-library/react';

