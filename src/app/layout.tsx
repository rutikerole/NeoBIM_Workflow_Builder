import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { MobileGate } from "@/components/MobileGate";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NeoBIM — No-Code Generative Workflow Builder for AEC",
    template: "%s | NeoBIM",
  },
  description:
    "Build AI-powered AEC workflows visually. Drag-and-drop nodes to create pipelines from PDF briefs to 3D massing to IFC export — without writing a single line of code.",
  keywords: ["AEC", "BIM", "workflow", "AI", "no-code", "architecture", "engineering", "construction"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-body antialiased bg-[#0A0A0F] text-[#F0F0F5]`}>
        <MobileGate>{children}</MobileGate>
        <Toaster
          position="bottom-right"
          theme="dark"
          duration={4000}
          toastOptions={{
            style: {
              background: "#15151F",
              border: "1px solid #1E1E2E",
              color: "#F0F0F5",
              fontSize: "12.5px",
              fontFamily: "var(--font-inter), sans-serif",
              borderRadius: "10px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
              padding: "12px 14px",
              gap: "10px",
            },
          }}
        />
      </body>
    </html>
  );
}
