import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conversation Practice Lab · GrowthAspire",
  description: "Practice high-stakes conversations with voice-powered AI roleplay. Get scored, get better.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="paper-bg">{children}</body>
    </html>
  );
}
