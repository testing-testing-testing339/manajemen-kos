import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import NavigationLoader from "@/components/NavigationLoader";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Graha Aisyah Menteng - Sistem Manajemen Kost",
  description: "Sistem manajemen operasional Graha Aisyah Menteng (53 Kamar: 13 VIP & 40 Non-VIP)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <body
        className="font-sans antialiased bg-slate-50 text-slate-900 tracking-normal selection:bg-indigo-600 selection:text-white"
      >
        <NavigationLoader />
        {children}
      </body>
    </html>
  );
}
