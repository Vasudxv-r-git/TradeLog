import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeLog — Personal Trading Journal",
  description: "Track your trades, analyze P&L, and improve your trading performance with TradeLog.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
