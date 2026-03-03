"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdOutlineTableChart, MdWbSunny, MdApartment } from "react-icons/md";

const links = [
  { href: "/etl",   label: "ETL Propiedades", icon: <MdOutlineTableChart size={16} /> },
  { href: "/clima", label: "Clima",           icon: <MdWbSunny size={16} /> },
];

export default function Navbar() {
  const path = usePathname();
  return (
    <header
      className="sticky top-0 z-50 border-b bg-white"
      style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(13,43,74,0.07)" }}
    >
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded flex items-center justify-center shrink-0 text-white"
            style={{ background: "var(--primary)" }}
          >
            <MdApartment size={18} />
          </div>
          <span className="font-bold text-sm" style={{ color: "var(--primary)" }}>
            Inmobiliaria
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  active
                    ? "text-white"
                    : "hover:bg-gray-50"
                }`}
                style={
                  active
                    ? { background: "var(--primary)", color: "#fff" }
                    : { color: "var(--muted)", border: "1px solid transparent" }
                }
              >
                {l.icon}
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
