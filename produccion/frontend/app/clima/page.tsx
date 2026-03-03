"use client";

import { useCallback, useEffect, useState } from "react";
import { getClima, actualizarClima, type ClimaRow } from "@/lib/api";
import WeatherCard from "@/components/clima/WeatherCard";

export default function ClimaPage() {
  const [data, setData]       = useState<ClimaRow[]>([]);
  const [filtro, setFiltro]   = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState<{ msg: string; ok: boolean } | null>(null);

  const datosFiltrados = filtro.trim()
    ? data.filter((d) => d.municipio.toLowerCase().includes(filtro.toLowerCase()))
    : data;

  // Carga desde BD al montar
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

  // Actualizar todos desde Open-Meteo
  const actualizarTodos = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await actualizarClima();
      setData(res.data);
      setStatus({
        msg: `${res.actualizados} municipio(s) actualizados${
          res.errores ? `, ${res.errores} error(es)` : ""
        }`,
        ok: true,
      });
    } catch (e: unknown) {
      setStatus({ msg: e instanceof Error ? e.message : "Error", ok: false });
    } finally {
      setLoading(false);
    }
  }, []);

  // Callback cuando una tarjeta actualiza individualmente
  const handleCardUpdate = useCallback((updated: ClimaRow) => {
    setData((prev) =>
      prev.map((d) => d.municipio === updated.municipio ? updated : d)
    );
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">🌤️ Clima — Valle de Aburrá</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="text"
            placeholder="Filtrar municipio…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500 w-44"
          />
          <button
            onClick={actualizarTodos}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Actualizando…
              </span>
            ) : (
              "🔄 Actualizar todos"
            )}
          </button>
        </div>
      </div>

      {status && (
        <div className={`rounded-lg p-3 text-sm border ${
          status.ok
            ? "bg-green-900/20 text-green-400 border-green-800"
            : "bg-red-900/20 text-red-400 border-red-800"
        }`}>
          {status.ok ? "✅" : "❌"} {status.msg}
        </div>
      )}

      {loading && data.length === 0 && (
        <p className="text-slate-500 text-sm">Cargando desde BD…</p>
      )}

      {data.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {datosFiltrados.length > 0 ? datosFiltrados.map((d) => (
            <WeatherCard key={d.municipio} d={d} onUpdate={handleCardUpdate} />
          )) : (
            <p className="text-slate-500 text-sm col-span-3">Sin resultados para &quot;{filtro}&quot;.</p>
          )}
        </div>
      ) : (
        !loading && (
          <p className="text-slate-500 text-sm">
            Sin datos. Pulsa &quot;Actualizar todos&quot; para consultar Open-Meteo.
          </p>
        )
      )}
    </div>
  );
}
