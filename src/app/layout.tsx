import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
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
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          richColors
          toastOptions={{
            style: {
              background: "#1A1A26",
              border: "1px solid #2A2A3E",
              color: "#F0F0F5",
            },
          }}
        />
      </body>
    </html>
  );
}
