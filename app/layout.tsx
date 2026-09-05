import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { PrivateStore } from "./private-store";

const title = "个人工作台";
const description =
  "一个用于目标、项目、理财、学习、内容和资料管理的个人工作台。";

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;
  const imageUrl = `${baseUrl}/og.png`;

  return {
    title,
    manifest: "/manifest.webmanifest",
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
          alt: "个人工作台预览",
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
      <body><PrivateStore>{children}</PrivateStore></body>
    </html>
  );
}
