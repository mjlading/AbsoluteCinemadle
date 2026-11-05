import type { Metadata, Viewport } from "next";
import { Sofia_Sans, Sofia_Sans_Condensed, Sofia_Sans_Extra_Condensed } from "next/font/google";
import "./globals.css";

const sofia = Sofia_Sans({ variable: "--font-sofia", subsets: ["latin"] });
const sofiaCondensed = Sofia_Sans_Condensed({ variable: "--font-sofia-condensed", subsets: ["latin"] });
const sofiaExtraCondensed = Sofia_Sans_Extra_Condensed({ variable: "--font-sofia-xc", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Absolute Cinemadle",
  description: "Movie and series puzzles from Absolute Cinemadle.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8eef1" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1014" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sofia.variable} ${sofiaCondensed.variable} ${sofiaExtraCondensed.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
