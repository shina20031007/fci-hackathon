import type { Metadata } from "next";
import "./globals.css";
import "@arcgis/core/assets/esri/themes/light/main.css";
import { LanguageProvider } from "@/lib/i18n/provider";
import { Shell } from "@/components/layout/shell";
export const metadata: Metadata = {
  icons: { icon: "/cityora-mark.svg" },
  title: {
    default: "cityora. — Your city. Your perspective.",
    template: "%s | cityora.",
  },
  description:
    "Follow municipal decisions from proposals to evidence, public input, and participation.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <LanguageProvider>
          <Shell>{children}</Shell>
        </LanguageProvider>
      </body>
    </html>
  );
}
