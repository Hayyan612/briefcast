import type { Metadata, Viewport } from "next";
import { Geist_Mono, Quicksand } from "next/font/google";

import { MotionProvider } from "@/components/motion-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const sans = Quicksand({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f7f7fb",
};

export const metadata: Metadata = {
  title: "Briefcast · Your daily research podcast",
  description:
    "Pick a topic and a time. Get a five-minute podcast on it, every day.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <MotionProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </MotionProvider>
        <Toaster theme="light" richColors position="top-center" />
      </body>
    </html>
  );
}
