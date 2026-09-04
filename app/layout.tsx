import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Chen's Personal OS";
const description =
  "A private operating system for goals, projects, income, learning, publishing, archives, and saved skills.";

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;
  const imageUrl = `${baseUrl}/og.png`;

  return {
    title,
    description,
    metadataBase: new URL(baseUrl),
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: baseUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Chen's Personal OS warm archive dashboard preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
