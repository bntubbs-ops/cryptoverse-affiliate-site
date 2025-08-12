
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CryptoVerse — Prices, News & Encrypted Chat",
  description: "Live crypto prices, curated news, and a peer-to-peer encrypted chatroom.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
