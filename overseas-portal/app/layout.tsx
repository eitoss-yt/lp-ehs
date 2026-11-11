import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getRegulations } from "@/lib/microcms";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: `${SITE.title}｜${SITE.name}`, template: `%s｜${SITE.title}` },
  description: SITE.description,
  openGraph: { siteName: SITE.title, locale: "ja_JP", type: "website" },
  // 正式公開までは検索エンジンに登録しない（公開時に SITE_PUBLIC=1 を設定）
  robots: process.env.SITE_PUBLIC === "1" ? undefined : { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const regs = await getRegulations();
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Header regulations={regs.filter((r) => r.isFeatured).map(({ id, name, region }) => ({ id, name, region }))} />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
