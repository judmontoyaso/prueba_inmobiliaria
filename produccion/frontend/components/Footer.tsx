import { MdOpenInNew } from "react-icons/md";

export default function Footer() {
  return (
    <footer
      className="border-t mt-10"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between text-xs" style={{ color: "var(--muted)" }}>
        <span>© {new Date().getFullYear()} Inmobiliaria — Prueba técnica</span>
        <a
          href="https://juanmontoya.me"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-medium transition-colors hover:underline"
          style={{ color: "var(--primary)" }}
        >
          juanmontoya.me
          <MdOpenInNew size={13} />
        </a>
      </div>
    </footer>
  );
}
