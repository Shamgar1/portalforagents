import type { Metadata } from "next";
import { Rubik } from "next/font/google";

import "./globals.css";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rubik"
});

export const metadata: Metadata = {
  title: "פורטל סוכנים",
  description: "פורטל ניהול לקוחות לסוכנים"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body>{children}</body>
    </html>
  );
}
