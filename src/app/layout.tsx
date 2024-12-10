import "~/styles/globals.css";

import { type Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "~/components/theme-provider";

export const metadata: Metadata = {
  title: "Skoutex",
  description: "Talk to your favorite football players data",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <ThemeProvider attribute="class" enableSystem disableTransitionOnChange>
          <div className="flex h-screen flex-col bg-background">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
