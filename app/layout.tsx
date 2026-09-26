import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import MotionProvider from "@/components/MotionProvider";
import "./globals.css";

const serif = Cormorant_Garamond({
  variable: "--font-serif-face",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const sans = Inter({
  variable: "--font-sans-face",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trade Compliance",
  description: "Every trade, graded against your own rules.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
