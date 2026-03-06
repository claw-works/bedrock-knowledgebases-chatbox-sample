import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Bedrock KB Chat",
  description: "Intelligent chat powered by Amazon Bedrock Knowledge Base",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <AuthGuard>{children}</AuthGuard>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
