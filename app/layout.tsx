import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知序 · 计算机学习工作台",
  description: "记录、理解、关联，让知识有序生长。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
