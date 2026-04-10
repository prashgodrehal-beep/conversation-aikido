import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conversation Aikido Dojo · GrowthAspire",
  description:
    "Practice the 3-step Aikido method for high-stakes conversations. Live AI roleplay with instant coach feedback.",
  openGraph: {
    title: "Conversation Aikido Dojo",
    description:
      "Eighteen years of school taught you to defend. High-stakes conversations require the opposite skill. Practice the method live.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,800&family=Inter+Tight:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="paper-bg">{children}</body>
    </html>
  );
}
