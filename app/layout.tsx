import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "Vibe OS | Tone Rewriter Lab",
  description: "AI-powered living lab for structural tone rewriting using QPE vectors.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${inter.variable}`}>
      <body className="min-h-screen font-sans selection:bg-primary/30 antialiased">
        <main className="max-w-md mx-auto min-h-screen relative p-4 flex flex-col pt-12">
          {children}
        </main>
      </body>
    </html>
  );
}
