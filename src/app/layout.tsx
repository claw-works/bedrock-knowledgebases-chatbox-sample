import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
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
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthGuard>{children}</AuthGuard>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
