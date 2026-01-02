import "./globals.css";
import { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agentic Studio",
  description: "AI agent workspace for creating and publishing YouTube videos."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div className="brand">
              <span className="brand-accent">Agentic</span> Studio
            </div>
            <div className="header-actions">
              <span className="status-dot" />
              <span className="status-text">Agent ready</span>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
