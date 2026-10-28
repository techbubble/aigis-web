import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "AIGIS",
  description: "AI-native geospatial intelligence: turn documents, spreadsheets, images and news into animated time-series maps.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-ink text-fog">
        <Script id="aigis-ui-mode" strategy="beforeInteractive">{`try{var m=localStorage.getItem("aigis-ui");if(m==="light"||m==="dark")document.documentElement.dataset.theme=m}catch(e){}`}</Script>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
