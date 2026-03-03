"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/etl",   label: "ETL Propiedades", icon: "📊" },
  { href: "/clima", label: "Clima",           icon: "🌤️" },
];

export default function Navbar() {
  const path = usePathname();
  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: "rgba(6,8,15,0.7)",
        borderColor: "var(--border)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
            style={{
              background: "linear-gradient(135deg, #6366f1, #22d3ee)",
              boxShadow: "0 0 14px rgba(99,102,241,0.5)",
            }}
          >
            🏠
          </div>
          <span className="font-semibold text-sm">
            <span className="glow-text font-bold">Inmobiliaria</span>
            <span className="text-slate-500 ml-1 font-light hidden sm:inline">Medellín</span>
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex gap-1">
          {links.map((l) => {
            const active = path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  active ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                style={
                  active
                    ? {
                        background: "rgba(99,102,241,0.18)",
                        border: "1px solid rgba(129,140,248,0.3)",
                        boxShadow: "0 0 14px rgba(99,102,241,0.22)",
                      }
                    : { border: "1px solid transparent" }
                }
              >
                <span>{l.icon}</span>
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
