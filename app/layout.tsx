import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ESS HR Portal",
  description: "Employee Self-Service HR Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
