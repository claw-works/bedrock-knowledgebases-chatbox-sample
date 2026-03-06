import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh-CN"],
  defaultLocale: "en",
  localePrefix: "never",          // no /en/ or /zh-CN/ prefix in URLs
  localeDetection: true,          // auto-detect from Accept-Language header
});
