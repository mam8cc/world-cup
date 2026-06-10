import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Cup Pool",
  description: "Run an office World Cup 2026 pool — picks and auto-updated standings.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site">
          <div className="container">
            <Link href="/" className="brand" style={{ color: "var(--text)" }}>
              <span className="ball">⚽</span> World Cup Pool
            </Link>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
