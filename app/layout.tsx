import "./globals.css";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";

const ui = Instrument_Sans({ subsets: ["latin"], variable: "--font-ui" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const receipt = JetBrains_Mono({ subsets: ["latin"], variable: "--font-receipt" });

export const metadata = {
  title: "Receipts",
  description: "A credibility tracker for anyone who makes calls",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${display.variable} ${receipt.variable}`}>
      <body>{children}</body>
    </html>
  );
}