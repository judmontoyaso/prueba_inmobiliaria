"use client";

import { useCallback, useEffect, useState } from "react";
import { getClima, actualizarClima, type ClimaRow } from "@/lib/api";
import WeatherCard from "@/components/clima/WeatherCard";

export default function ClimaPage() {
  const [data, setData]       = useState<ClimaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState<{ msg: string; ok: boolean } | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await getClima();
      setData(res.data);
      setStatus({ msg: `${res.data.length} municipio(s) cargados desde BD`, ok: true });
    } catch (e: unknown) {
      setStatus({ msg: e instanceof Error ? e.message : "Error", ok: false });
    } finally {
      setLoading(false);
    }
  }, []);

  const actualizar = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await actualizarClima();
      setData(res.data);
      setStatus({
        msg: `${res.actualizados} municipio(s) actualizados desde Open-Meteo${
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

  // Al montar, carga desde BD
  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">🌤️ Clima — Valle de Aburrá</h1>
        <div className="flex gap-2">
          <button
            onClick={cargar}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            📥 Cargar desde BD
          </button>
          <button
            onClick={actualizar}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Consultando…
              </span>
            ) : (
              "🔄 Actualizar clima"
            )}
          </button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div
          className={`rounded-lg p-3 text-sm border ${
            status.ok
              ? "bg-green-900/20 text-green-400 border-green-800"
              : "bg-red-900/20 text-red-400 border-red-800"
          }`}
        >
          {status.ok ? "✅" : "❌"} {status.msg}
        </div>
      )}

      {/* Grid */}
      {data.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.map((d) => (
            <WeatherCard key={d.municipio} d={d} />
          ))}
        </div>
      ) : (
        !loading && (
          <p className="text-slate-500 text-sm">
            Sin datos. Pulsa &quot;Actualizar clima&quot; para consultar Open-Meteo.
          </p>
        )
      )}
    </div>
  );
}
