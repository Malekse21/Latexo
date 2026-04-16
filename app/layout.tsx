import type { Metadata } from "next";
import { Inter, STIX_Two_Text, Fraunces, DM_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/context/user-context";
import NextTopLoader from "nextjs-toploader";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const stixTwoText = STIX_Two_Text({ subsets: ["latin"], variable: "--font-latex" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-dm-mono" });

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
    <html lang="en" className={`${inter.variable} ${stixTwoText.variable} ${fraunces.variable} ${dmMono.variable}`}>
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
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
