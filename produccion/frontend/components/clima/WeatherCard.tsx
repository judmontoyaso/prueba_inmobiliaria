"use client";

import { useState } from "react";
import type { ClimaRow } from "@/lib/api";
import { actualizarClima } from "@/lib/api";

function weatherInfo(code: number): { icon: string; glow: string } {
  if (code === 0)  return { icon: "☀️",  glow: "rgba(251,191,36,0.22)" };
  if (code <= 2)   return { icon: "🌤️", glow: "rgba(251,191,36,0.14)" };
  if (code === 3)  return { icon: "☁️",  glow: "rgba(148,163,184,0.12)" };
  if (code <= 48)  return { icon: "🌫️", glow: "rgba(148,163,184,0.1)" };
  if (code <= 57)  return { icon: "🌦️", glow: "rgba(96,165,250,0.14)" };
  if (code <= 67)  return { icon: "🌧️", glow: "rgba(96,165,250,0.22)" };
  if (code <= 77)  return { icon: "❄️",  glow: "rgba(186,230,253,0.18)" };
  return             { icon: "⛈️",  glow: "rgba(251,191,36,0.18)" };
}

function formatFecha(f: string | null | undefined) {
  if (!f) return null;
  const d = new Date(f);
  if (isNaN(d.getTime())) return f;
  return d.toLocaleString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Bogota",
  });
}

function tempGradient(t: number): string {
  if (t >= 28) return "linear-gradient(135deg, #fbbf24, #f97316)";
  if (t >= 22) return "linear-gradient(135deg, #a5b4fc, #818cf8)";
  return "linear-gradient(135deg, #38bdf8, #22d3ee)";
}

export default function WeatherCard({
  d: initial,
  onUpdate,
}: {
  d: ClimaRow;
  onUpdate?: (updated: ClimaRow) => void;
}) {
  const [d, setD]             = useState<ClimaRow>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleActualizar = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await actualizarClima([d.municipio]);
      if (res.data[0]) {
        setD(res.data[0]);
        onUpdate?.(res.data[0]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const { icon, glow } = weatherInfo(d.weather_code);

  return (
    <div
      className="glass glass-hover rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ boxShadow: `0 4px 30px ${glow}` }}
    >
      {/* Watermark icon */}
      <span
        aria-hidden
        className="absolute -right-2 -top-1 text-7xl opacity-[0.08] pointer-events-none select-none"
      >
        {icon}
      </span>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm text-white tracking-wide">{d.municipio}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(100,116,139,0.9)" }}>
            {d.latitud}°N · {d.longitud}°W
          </p>
        </div>
        <button
          onClick={handleActualizar}
          disabled={loading}
          title="Actualizar"
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all disabled:opacity-40"
          style={{
            background: "rgba(129,140,248,0.12)",
            border: "1px solid rgba(129,140,248,0.28)",
          }}
        >
          {loading ? (
            <span className="inline-block w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            "🔄"
          )}
        </button>
      </div>

      {/* Temperature */}
      <div>
        <p
          className="text-4xl font-bold leading-none"
          style={{
            background: tempGradient(d.temperatura_c),
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {d.temperatura_c}°C
        </p>
        <p className="text-slate-400 text-xs mt-1.5">{d.descripcion_clima}</p>
      </div>

      {/* Timestamp */}
      {d.ultima_actualizacion && (
        <p
          className="text-xs pt-2.5"
          style={{ borderTop: "1px solid var(--border)", color: "rgba(100,116,139,0.8)" }}
        >
          🕒 {formatFecha(d.ultima_actualizacion)}
        </p>
      )}

      {error && <p className="text-red-400 text-xs">❌ {error}</p>}
    </div>
  );
}
