import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio | Full-Stack Developer & AI Engineer",
  description:
    "Python / TypeScript / Next.js を中心に、金融・製造・AI分野のプロダクトを開発するフルスタックエンジニアのポートフォリオ。",
  openGraph: {
    title: "Portfolio | Full-Stack Developer & AI Engineer",
    description: "AIとデータで、ビジネスの未来を創る",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "Portfolio | Full-Stack Developer & AI Engineer",
    description: "AIとデータで、ビジネスの未来を創る",
  },
  robots: { index: true, follow: true },
};

export default function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: "Your Name",
            jobTitle: "Full-Stack Developer & AI Engineer",
            description: "AIとデータで、ビジネスの未来を創る",
          }),
        }}
      />
      {children}
    </>
  );
}
