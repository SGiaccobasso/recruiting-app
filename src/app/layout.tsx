import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Recruiting App",
  description: "Get Top Web3 Contributors",
};
const clashGrotesk = localFont({
  src: [
    {
      path: "../../public/fonts/ClashGrotesk-Extralight.woff",
      weight: "200",
      style: "normal",
    },
    {
      path: "../../public/fonts/ClashGrotesk-Light.woff",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/ClashGrotesk-Regular.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/ClashGrotesk-Medium.woff",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/ClashGrotesk-Semibold.woff",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/ClashGrotesk-Bold.woff",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-clash-grotesk",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${clashGrotesk.className} bg-black flex min-h-screen flex-col items-center justify-center text-white`}
      >
        {children}
      </body>
    </html>
  );
}
