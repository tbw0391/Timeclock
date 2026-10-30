import type { Metadata, Viewport } from "next";
import { Fredoka, Noto_Sans_Arabic } from "next/font/google";
import { getT } from "@/lib/i18n/server";
import "./globals.css";

// Fredoka for Latin text; Noto Sans Arabic covers Farsi, Dari, Pashto and
// Arabic (including Pashto's extra letters). The browser picks per character.
const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-latin" });
const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--font-arabic" });

// Icons are the KITE logo's kite, cut out into public/brand.
export const metadata: Metadata = {
  title: "KITE Timeclock",
  icons: {
    icon: [
      { url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/brand/apple-icon.png", sizes: "180x180" },
  },
  appleWebApp: { capable: true, title: "KITE Time", statusBarStyle: "default" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#c49edf" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir } = await getT();
  return (
    <html lang={locale} dir={dir} className={`${fredoka.variable} ${arabic.variable}`}>
      <body className="min-h-screen antialiased">
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
