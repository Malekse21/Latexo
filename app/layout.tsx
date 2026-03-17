import type { Metadata } from "next";
import { Inter, STIX_Two_Text } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/context/user-context";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import NextTopLoader from "nextjs-toploader";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const stixTwoText = STIX_Two_Text({ subsets: ["latin"], variable: "--font-latex" });

export const metadata: Metadata = {
  title: "Latexo - Your PFE, Perfected",
  description: "Academic compliance, Plagiarism/AI detection, and an interactive Jury Simulation.",
  icons: {
    icon: "/images/favicon.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${stixTwoText.variable}`}>
      <body className={`${inter.className} antialiased font-sans text-gray-900 bg-gray-50`}>
        <NextTopLoader
          color="#000000"
          initialPosition={0.08}
          crawlSpeed={200}
          height={2}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #000000,0 0 5px #000000"
        />
        <PostHogProvider>
          <UserProvider>
            {children}
          </UserProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
