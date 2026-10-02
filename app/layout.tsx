import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "M-Chango · Fundraise together",
  description: "A simple contribution ledger for fundraisers organized on WhatsApp.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
