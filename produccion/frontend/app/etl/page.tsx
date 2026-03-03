"use client";

import { useCallback, useState } from "react";
import { uploadCSV, resetETL, type Reporte } from "@/lib/api";
import ReporteStats from "@/components/etl/ReporteStats";
import DataTable from "@/components/etl/DataTable";

type Row = Record<string, unknown>;

export default function ETLPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [propiedades, setPropiedades] = useState<Row[]>([]);
  const [anuncios, setAnuncios]       = useState<Row[]>([]);
  const [dragging, setDragging]       = useState(false);
  const [resetting, setResetting]     = useState(false);

  const handleReset = useCallback(async () => {
    if (!confirm("¿Seguro? Esto borrará TODAS las propiedades y anuncios de la BD.")) return;
    setResetting(true);
    setError(null);
    try {
      await resetETL();
      setReporte(null);
      setPropiedades([]);
      setAnuncios([]);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al reiniciar");
    } finally {
      setResetting(false);
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Solo se aceptan archivos .csv");
      return;
    }
    setLoading(true);
    setError(null);
    setReporte(null);
    try {
      const data = await uploadCSV(file);
      setReporte(data.reporte);
      setPropiedades(data.preview_propiedades);
      setAnuncios(data.preview_anuncios);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">📊 ETL Propiedades</h1>
        <button
          onClick={handleReset}
          disabled={resetting || loading}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-red-700 hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          {resetting ? "Reiniciando…" : "🗑️ Reiniciar BD"}
        </button>
      </div>

      {/* Upload */}
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-10 cursor-pointer transition-colors ${
            dragging ? "border-indigo-500 bg-indigo-900/10" : "border-slate-700"
          }`}
        >
          <span className="text-4xl">📄</span>
          <span className="font-medium text-sm">
            {loading ? "Procesando…" : "Arrastra tu CSV aquí o haz clic"}
          </span>
          <span className="text-slate-500 text-xs">propiedades_medellin_raw.csv</span>
          <input type="file" accept=".csv" hidden onChange={onInputChange} />
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg p-3 text-sm bg-red-900/20 text-red-400 border border-red-800">
          ❌ {error}
        </div>
      )}

      {/* Reporte */}
      {reporte && (
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <h2 className="text-sm font-semibold">📋 Reporte de calidad</h2>
          <ReporteStats reporte={reporte} />
          <p className="text-xs text-green-400">
            ✅ {reporte.propiedades_validas.toLocaleString("es-CO")} propiedades y{" "}
            {reporte.anuncios_validos.toLocaleString("es-CO")} anuncios cargados en Supabase.
          </p>
        </div>
      )}

      {/* Previews */}
      <DataTable rows={propiedades} title="🏗️ Propiedades (preview 20 filas)" />
      <DataTable rows={anuncios}    title="💰 Anuncios (preview 20 filas)" />
    </div>
  );
}
