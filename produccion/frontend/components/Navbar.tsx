"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/etl",   label: "📊 ETL Propiedades" },
  { href: "/clima", label: "🌤️ Clima" },
];

export default function Navbar() {
  const path = usePathname();
  return (
    <header
      className="border-b px-4 py-3 flex items-center justify-between"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <span className="font-semibold text-sm">
        🏠 Inmobiliaria <span className="text-indigo-400">Medellín</span>
      </span>
      <nav className="flex gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              path.startsWith(l.href)
                ? "bg-indigo-600 text-white font-medium"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
