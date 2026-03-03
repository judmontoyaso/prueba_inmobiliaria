"use client";

import { useState } from "react";
import type { ClimaRow } from "@/lib/api";
import { actualizarClima } from "@/lib/api";

function weatherIcon(code: number) {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  return "⛈️";
}

function formatFecha(f: string | null | undefined) {
  if (!f) return null;
  const d = new Date(f);
  if (isNaN(d.getTime())) return f;
  return d.toLocaleString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function WeatherCard({
  d: initial,
  onUpdate,
}: {
  d: ClimaRow;
  onUpdate?: (updated: ClimaRow) => void;
}) {
  const [d, setD]           = useState<ClimaRow>(initial);
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

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-2"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm">
          {weatherIcon(d.weather_code)} {d.municipio}
        </p>
        <button
          onClick={handleActualizar}
          disabled={loading}
          title="Actualizar este municipio"
          className="text-xs px-2 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0"
        >
          {loading ? (
            <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            "🔄"
          )}
        </button>
      </div>

      <p className="text-3xl font-bold text-indigo-400">{d.temperatura_c}°C</p>
      <p className="text-slate-400 text-xs">{d.descripcion_clima}</p>
      <p className="text-slate-600 text-xs">📍 {d.latitud}, {d.longitud}</p>

      {d.ultima_actualizacion && (
        <p className="text-slate-500 text-xs border-t border-slate-700 pt-2 mt-1">
          🕒 {formatFecha(d.ultima_actualizacion)}
        </p>
      )}

      {error && <p className="text-red-400 text-xs">❌ {error}</p>}
    </div>
  );
}
