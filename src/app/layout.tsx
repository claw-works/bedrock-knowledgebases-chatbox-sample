import type { Metadata } from "next";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import ThemeProvider from "@/components/ThemeProvider";

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthGuard>{children}</AuthGuard>
        </ThemeProvider>
      </body>
    </html>
  );
}
