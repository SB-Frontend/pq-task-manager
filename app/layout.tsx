import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { getTheme } from "@/lib/settings/theme";
import { site } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: site.name, template: `%s - ${site.name}` },
  description: site.description,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Read on the server so the correct palette is in the very first paint:
  // there is no flash of the wrong theme and no client-side script.
  const theme = await getTheme();

  return (
    <html
      lang="en"
      // "system" sets no attribute, leaving the CSS media query in charge.
      data-theme={theme === "system" ? undefined : theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* The authenticated area supplies its own shell; auth pages centre themselves. */}
      <body className="min-h-full">{children}</body>
    </html>
  );
}
