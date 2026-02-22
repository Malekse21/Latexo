import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/context/user-context";
import NextTopLoader from "nextjs-toploader";

const ebGaramond = EB_Garamond({ subsets: ["latin"] });

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
    <html lang="en">
      <body className={`${ebGaramond.className} antialiased bg-dot-grid`}>
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
