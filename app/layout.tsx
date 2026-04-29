import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Cormorant_Garamond, DM_Mono, Lora } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Backgammon Society – Accounting",
  description: "Per-club accounting dashboard for The Backgammon Society",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontClasses = [
    inter.variable,
    cormorant.variable,
    dmMono.variable,
    lora.variable,
  ].join(" ");

  return (
    <html lang="en" className={fontClasses}>
      <body style={{ margin: 0, padding: 0, minHeight: "100vh" }}>
        {/* Decorative backgammon stripe */}
        <div className="bs-stripe" />

        {/* App shell */}
        <div style={{ display: "flex", height: "calc(100vh - 4px)", overflow: "hidden" }}>
          {/* Sidebar (hidden on mobile, shown via overlay) */}
          <Navigation />

          {/* Main content */}
          <main
            style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
          >
            <div
              style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 28px 64px" }}
              className="main-content"
            >
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
