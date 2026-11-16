import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { ThemeProvider } from "next-themes";

import { UmamiAnalytics } from "@/components/analytics/umami";
import { MotionProvider } from "@/components/motion-provider";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Closest match to San Francisco, for devices that do not have it (Windows, Android,
// Linux). Apple devices keep the system font; see --font-macos in globals.css.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1f20" },
  ],
};

export const metadata: Metadata = {
  // Absolute URLs for the link-preview image (set from APP_URL in docker-compose).
  metadataBase: new URL(process.env.AUTH_URL ?? "http://localhost:3000"),
  title: "Briefcast · Your daily research podcast",
  applicationName: "Briefcast",
  description: "A five-minute research podcast on what you follow, every day.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <MotionProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </MotionProvider>
          <Toaster />
          <UmamiAnalytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
