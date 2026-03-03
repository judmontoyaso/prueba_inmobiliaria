"use client";

import { useCallback, useEffect, useState } from "react";
import { getClima, actualizarClima, type ClimaRow } from "@/lib/api";
import WeatherCard from "@/components/clima/WeatherCard";
import {
  MdWbCloudy, MdOutlineRefresh, MdSearch,
  MdCheckCircleOutline, MdErrorOutline,
} from "react-icons/md";

function Spinner() {
  return (
    <span
      className="inline-block w-3.5 h-3.5 border-2 rounded-full animate-spin"
      style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }}
    />
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
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold glow-text flex items-center gap-2">
            <MdWbCloudy size={26} />
            Clima en Tiempo Real
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Valle de Aburrá — 10 municipios via Open-Meteo
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex items-center">
            <MdSearch
              size={16}
              className="absolute left-2.5 pointer-events-none"
              style={{ color: "var(--muted)" }}
            />
            <input
              type="text"
              placeholder="Filtrar municipio…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="pl-8 pr-3 py-2 rounded text-sm focus:outline-none w-44"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-2)",
                color: "var(--text)",
              }}
            />
          </div>

          {/* Update all */}
          <button
            onClick={actualizarTodos}
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded text-sm font-medium"
          >
            <MdOutlineRefresh size={17} />
            {loading ? <><Spinner /> Actualizando…</> : "Actualizar todos"}
          </button>
        </div>
      </div>

      {/* ── Status banner ─────────────────────────────────────────────── */}
      {status && (
        <div
          className="rounded px-4 py-3 text-sm flex items-center gap-2"
          style={{
            background: status.ok ? "#edf7f0" : "#fdf0ee",
            border: `1px solid ${status.ok ? "#b8e0c4" : "#f0c0b8"}`,
            color: status.ok ? "var(--success)" : "var(--danger)",
          }}
        >
          {status.ok
            ? <MdCheckCircleOutline size={16} />
            : <MdErrorOutline size={16} />
          }
          {status.msg}
        </div>
      )}

      {/* ── Loading state ─────────────────────────────────────────────── */}
      {loading && data.length === 0 && (
        <div className="flex items-center justify-center gap-3 py-16">
          <span
            className="inline-block w-5 h-5 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--border-2)", borderTopColor: "var(--primary)" }}
          />
          <span className="text-sm" style={{ color: "var(--muted)" }}>Cargando datos del clima…</span>
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
          <div className="card p-10 text-center">
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Sin resultados para &quot;<span style={{ color: "var(--text)" }}>{filtro}</span>&quot;
            </p>
          </div>
        )
      ) : (
        !loading && (
          <div className="card p-10 text-center space-y-3">
            <MdWbCloudy size={40} className="mx-auto" style={{ color: "var(--border-2)" }} />
            <p className="text-sm" style={{ color: "var(--muted)" }}>Sin datos de clima todavía.</p>
            <button
              onClick={actualizarTodos}
              className="btn-primary flex items-center gap-2 px-5 py-2 rounded text-sm font-medium mx-auto"
            >
              <MdOutlineRefresh size={16} />
              Consultar Open-Meteo
            </button>
          </div>
        )
      )}
    </div>
  );
}
