import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Inmobiliaria Medellín",
  description: "ETL de propiedades + clima del Valle de Aburrá",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        {/* Extra aurora blob — pink center */}
        <div
          aria-hidden
          className="pointer-events-none fixed bottom-32 left-1/3 w-96 h-96 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 70%)",
            filter: "blur(100px)",
            zIndex: 0,
          }}
        />
        <div className="relative z-10">
          <Navbar />
          <main className="max-w-6xl mx-auto px-5 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
