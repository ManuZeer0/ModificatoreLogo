import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signature Animator",
  description: "Crea loghi animati stagionali per la tua firma email.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
