import type { Metadata, Viewport } from "next";

import { MotionProvider } from "@/components/motion-provider";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

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
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <MotionProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </MotionProvider>
        <Toaster />
      </body>
    </html>
  );
}
