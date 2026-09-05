import type { ReactNode } from 'react';

export const metadata = {
  title: "AK IT'S TIME TO SHINE — Print Studio API",
  description: 'JSON API for the AK print studio. Interactive reference at /docs.',
};

/**
 * The API has exactly one HTML surface: the Swagger page. This layout exists so
 * Next.js can render it; no styling framework is pulled in on purpose.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>{children}</body>
    </html>
  );
}
