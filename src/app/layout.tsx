import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bedrock KB Chat",
  description: "Intelligent chat powered by Amazon Bedrock Knowledge Base",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
