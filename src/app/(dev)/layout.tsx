import { notFound } from 'next/navigation';

/**
 * Dev-only route group layout.
 * All routes under (dev)/ are only accessible in non-production environments.
 */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return <>{children}</>;
}
