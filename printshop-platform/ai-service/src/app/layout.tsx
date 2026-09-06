import type { ReactNode } from "react";

export const metadata = {
  title: "AK IT'S TIME TO SHINE — AI Service",
  description: "Internal RAG assistant service. Not reachable from the public internet.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
