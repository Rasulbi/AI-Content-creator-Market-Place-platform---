import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Creator Marketplace - Where Brands Find Verified AI Creators",
  description:
    "Connect with skilled AI content creators, verify their expertise, and bring your creative vision to life with automated AI matching.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#FDFDFE] text-slate-900 selection:bg-purple-100 selection:text-purple-900">
        {children}
      </body>
    </html>
  );
}
