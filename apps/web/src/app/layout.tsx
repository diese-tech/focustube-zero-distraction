import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FocusTube Zero-Distraction Engine",
  description: "Foundation scaffold for the FocusTube engineering challenge."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
