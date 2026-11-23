import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NIAGARA ERP — Smarter Business Management",
    template: "%s · NIAGARA ERP",
  },
  description:
    "NIAGARA ERP membantu UMKM mengelola inventaris, penjualan, dan keuangan dalam satu platform yang aman dan terintegrasi.",
  applicationName: "NIAGARA ERP",
  keywords: ["ERP", "inventaris", "POS", "laporan keuangan", "UMKM"],
  authors: [{ name: "NIAGARA" }],
};

export const viewport: Viewport = {
  themeColor: "#0E3132",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={cn(plusJakarta.variable, geistMono.variable)}
    >
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
