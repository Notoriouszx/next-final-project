import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "E-Healthcare System",
  description: "Modern healthcare management system with secure authentication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
