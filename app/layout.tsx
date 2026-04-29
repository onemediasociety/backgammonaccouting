import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Cormorant_Garamond, DM_Mono, Lora } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { SpeedInsights } from "@vercel/speed-insights/next";

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

        {/* App shell: sidebar + content side by side on desktop */}
        <div className="app-shell">
          <Navigation />
          <main className="app-main">
            <div className="app-main-inner">
              {children}
            </div>
          </main>
        </div>
        <SpeedInsights />
      </body>
    </html>
  );
}
