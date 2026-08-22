import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ToastProvider } from "@/components/ui/toast";

const notoNastaliq = Noto_Nastaliq_Urdu({
  variable: "--font-noto-nastaliq",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "جامعہ تعلیم القرآن — نظم و انصرام سسٹم",
  description: "Jamia Taleem-ul-Quran Management System",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ur" dir="rtl" className={`${notoNastaliq.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LocaleProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
