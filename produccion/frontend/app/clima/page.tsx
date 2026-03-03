"use client";

import { useCallback, useEffect, useState } from "react";
import { getClima, actualizarClima, type ClimaRow } from "@/lib/api";
import WeatherCard from "@/components/clima/WeatherCard";

function Spinner() {
  return (
    <span className="inline-block w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
  );
}

export default function ClimaPage() {
  const [data, setData]       = useState<ClimaRow[]>([]);
  const [filtro, setFiltro]   = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState<{ msg: string; ok: boolean } | null>(null);

  const datosFiltrados = filtro.trim()
    ? data.filter((d) => d.municipio.toLowerCase().includes(filtro.toLowerCase()))
    : data;

  const cargarBD = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getClima();
      setData(res.data);
    } catch (e: unknown) {
      setStatus({ msg: e instanceof Error ? e.message : "Error cargando BD", ok: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarBD(); }, [cargarBD]);

  const actualizarTodos = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await actualizarClima();
      setData(res.data);
      setStatus({
        msg: `${res.actualizados} municipio(s) actualizados${res.errores ? `, ${res.errores} error(es)` : ""}`,
        ok: true,
      });
    } catch (e: unknown) {
      setStatus({ msg: e instanceof Error ? e.message : "Error", ok: false });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCardUpdate = useCallback((updated: ClimaRow) => {
    setData((prev) => prev.map((d) => d.municipio === updated.municipio ? updated : d));
  }, []);

  return (
    <div className="space-y-7">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold glow-text">Clima en Tiempo Real</h1>
          <p className="text-slate-500 text-sm mt-1">Valle de Aburrá — 10 municipios via Open-Meteo</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Filtrar municipio…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="pl-7 pr-3 py-2 rounded-xl text-sm focus:outline-none w-44"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border-2)",
                color: "var(--text)",
              }}
            />
          </div>

          {/* Update all */}
          <button
            onClick={actualizarTodos}
            disabled={loading}
            className="btn-primary px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
          >
            {loading ? <><Spinner /> Actualizando…</> : "🔄 Actualizar todos"}
          </button>
        </div>
      </div>

      {/* ── Status banner ─────────────────────────────────────────────── */}
      {status && (
        <div
          className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
          style={{
            background: status.ok ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
            border: `1px solid ${status.ok ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
            color: status.ok ? "#34d399" : "#f87171",
          }}
        >
          <span>{status.ok ? "✅" : "❌"}</span>
          {status.msg}
        </div>
      )}

      {/* ── Loading state ─────────────────────────────────────────────── */}
      {loading && data.length === 0 && (
        <div className="flex items-center justify-center gap-3 py-16">
          <Spinner />
          <span className="text-slate-500 text-sm">Cargando datos del clima…</span>
        </div>
      )}

      {/* ── Cards grid ────────────────────────────────────────────────── */}
      {data.length > 0 ? (
        datosFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {datosFiltrados.map((d) => (
              <WeatherCard key={d.municipio} d={d} onUpdate={handleCardUpdate} />
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-slate-500 text-sm">
              Sin resultados para &quot;<span className="text-slate-300">{filtro}</span>&quot;
            </p>
          </div>
        )
      ) : (
        !loading && (
          <div className="glass rounded-2xl p-10 text-center space-y-3">
            <p className="text-2xl">🌤️</p>
            <p className="text-slate-400 text-sm">Sin datos de clima todavía.</p>
            <button
              onClick={actualizarTodos}
              className="btn-primary px-5 py-2 rounded-xl text-sm font-medium"
            >
              Consultar Open-Meteo
            </button>
          </div>
        )
      )}
    </div>
  );
}
