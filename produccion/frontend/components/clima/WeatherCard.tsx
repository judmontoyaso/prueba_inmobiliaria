"use client";

import { useState } from "react";
import type { ClimaRow } from "@/lib/api";
import { actualizarClima } from "@/lib/api";
import {
  MdWbSunny, MdCloud, MdOutlineWaterDrop, MdSnowing,
  MdThunderstorm, MdOutlineRefresh, MdAccessTime,
  MdFilterDrama, MdGrain,
} from "react-icons/md";

function weatherInfo(code: number): { icon: React.ReactNode; borderColor: string } {
  if (code === 0)  return { icon: <MdWbSunny        size={48} color="#f59e0b" />, borderColor: "#f59e0b" };
  if (code <= 2)   return { icon: <MdFilterDrama     size={48} color="#fbbf24" />, borderColor: "#fbbf24" };
  if (code === 3)  return { icon: <MdCloud           size={44} color="#9ca3af" />, borderColor: "#9ca3af" };
  if (code <= 48)  return { icon: <MdCloud           size={44} color="#b0b8c8" />, borderColor: "#b0b8c8" };
  if (code <= 57)  return { icon: <MdGrain           size={44} color="#60a5fa" />, borderColor: "#60a5fa" };
  if (code <= 67)  return { icon: <MdOutlineWaterDrop size={44} color="#3b82f6" />, borderColor: "#3b82f6" };
  if (code <= 77)  return { icon: <MdSnowing         size={44} color="#7dd3fc" />, borderColor: "#7dd3fc" };
  return             { icon: <MdThunderstorm       size={44} color="#d97706" />, borderColor: "#d97706" };
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

function tempColor(t: number): string {
  if (t >= 28) return "#d97706";   // warm amber
  if (t >= 22) return "#0d2b4a";   // navy
  return "#1773a0";                  // teal/cool
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

  const { icon, borderColor } = weatherInfo(d.weather_code);

  return (
    <div
      className="card glass-hover flex flex-col gap-3 overflow-hidden"
      style={{ borderTop: `3px solid ${borderColor}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-5 pt-4">
        <div>
          <p className="font-semibold text-sm" style={{ color: "var(--primary)" }}>{d.municipio}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {d.latitud}°N · {d.longitud}°W
          </p>
        </div>
        <button
          onClick={handleActualizar}
          disabled={loading}
          title="Actualizar"
          className="shrink-0 w-8 h-8 rounded flex items-center justify-center transition-all disabled:opacity-40"
          style={{
            background: "#e8eef7",
            border: "1px solid var(--border)",
            color: "var(--primary)",
          }}
        >
          {loading ? (
            <span className="inline-block w-3.5 h-3.5 border-2 rounded-full animate-spin"
              style={{ borderColor: "var(--border-2)", borderTopColor: "var(--primary)" }} />
          ) : (
            <MdOutlineRefresh size={17} />
          )}
        </button>
      </div>

      {/* Weather icon + Temperature */}
      <div className="flex items-center gap-4 px-5">
        <div aria-hidden className="opacity-75 shrink-0">
          {icon}
        </div>
        <div>
          <p
            className="text-4xl font-bold leading-none"
            style={{ color: tempColor(d.temperatura_c) }}
          >
            {d.temperatura_c}°C
          </p>
          <p className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>{d.descripcion_clima}</p>
        </div>
      </div>

      {/* Timestamp */}
      {d.ultima_actualizacion && (
        <div
          className="flex items-center gap-1.5 px-5 py-2.5 text-xs"
          style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}
        >
          <MdAccessTime size={13} />
          {formatFecha(d.ultima_actualizacion)}
        </div>
      )}

      {error && (
        <p className="text-xs px-5 pb-3" style={{ color: "var(--danger)" }}>{error}</p>
      )}
    </div>
  );
}
