"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadCSV, resetETL, getPropiedades, type Reporte } from "@/lib/api";
import ReporteStats from "@/components/etl/ReporteStats";
import DataTable from "@/components/etl/DataTable";

type Row = Record<string, unknown>;

interface UploadResult {
  id: number;
  filename: string;
  ok: boolean;
  reporte?: Reporte;
  preview_propiedades?: Row[];
  preview_anuncios?: Row[];
  error?: string;
}

export default function ETLPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading]     = useState(false);
  const [dragging, setDragging]   = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploads, setUploads]     = useState<UploadResult[]>([]);
  const [dbProp, setDbProp]       = useState<Row[]>([]);
  const [dbLoading, setDbLoading] = useState(false);

  // Carga datos existentes de la BD al montar
  const cargarBD = useCallback(async () => {
    setDbLoading(true);
    try {
      const res = await getPropiedades(100, 0);
      setDbProp(res.data);
    } catch {
      // silencioso — la BD puede estar vacía
    } finally {
      setDbLoading(false);
    }
  }, []);

  useEffect(() => { cargarBD(); }, [cargarBD]);

  const handleReset = useCallback(async () => {
    if (!confirm("¿Seguro? Esto borrará TODAS las propiedades y anuncios de la BD.")) return;
    setResetting(true);
    try {
      await resetETL();
      setUploads([]);
      setDbProp([]);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al reiniciar");
    } finally {
      setResetting(false);
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Solo se aceptan archivos .csv");
      return;
    }
    // Resetea el input para aceptar el mismo archivo nuevamente
    if (inputRef.current) inputRef.current.value = "";

    const id = Date.now();
    setLoading(true);
    try {
      const data = await uploadCSV(file);
      setUploads((prev) => [{
        id,
        filename: file.name,
        ok: true,
        reporte: data.reporte,
        preview_propiedades: data.preview_propiedades,
        preview_anuncios: data.preview_anuncios,
      }, ...prev]);
      // Refresca vista de BD tras cada carga exitosa
      cargarBD();
    } catch (e: unknown) {
      setUploads((prev) => [{
        id,
        filename: file.name,
        ok: false,
        error: e instanceof Error ? e.message : "Error desconocido",
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  }, [cargarBD]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Upload zone */}
      <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-10 cursor-pointer transition-colors ${
            dragging ? "border-indigo-500 bg-indigo-900/10" : loading ? "border-yellow-600 bg-yellow-900/10" : "border-slate-700"
          }`}
        >
          <span className="text-4xl">{loading ? "⏳" : "📄"}</span>
          <span className="font-medium text-sm">
            {loading ? "Procesando CSV… espera" : "Arrastra tu CSV aquí o haz clic (acepta múltiples archivos uno a uno)"}
          </span>
          <span className="text-slate-500 text-xs">Solo archivos .csv</span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            hidden
            disabled={loading}
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          />
        </label>
      </div>

      {/* Historial de cargas */}
      {uploads.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400">Historial de cargas ({uploads.length})</h2>
          {uploads.map((u, i) => (
            <div
              key={u.id}
              className="rounded-xl border p-4 space-y-3"
              style={{ borderColor: u.ok ? "var(--border)" : "#7f1d1d", background: "var(--surface)" }}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>{u.ok ? "✅" : "❌"}</span>
                <span className="font-mono">{u.filename}</span>
                {i === 0 && <span className="text-xs text-indigo-400 ml-auto">← última</span>}
              </div>
              {u.ok && u.reporte ? (
                <>
                  <ReporteStats reporte={u.reporte} />
                  <p className="text-xs text-green-400">
                    {u.reporte.propiedades_validas.toLocaleString("es-CO")} propiedades •{" "}
                    {u.reporte.anuncios_validos.toLocaleString("es-CO")} anuncios cargados •{" "}
                    {u.reporte.propiedades_rechazadas.toLocaleString("es-CO")} rechazadas •{" "}
                    {u.reporte.duplicados.toLocaleString("es-CO")} duplicados
                  </p>
                  <DataTable rows={u.preview_propiedades ?? []} title="🏗️ Preview propiedades (20 filas)" />
                  <DataTable rows={u.preview_anuncios ?? []}    title="💰 Preview anuncios (20 filas)" />
                </>
              ) : (
                <p className="text-sm text-red-400">{u.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Datos actuales en BD */}
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">🗄️ Propiedades en BD ({dbProp.length}{dbProp.length === 100 ? "+" : ""})</h2>
          <button
            onClick={cargarBD}
            disabled={dbLoading}
            className="text-xs px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
          >
            {dbLoading ? "Cargando…" : "🔄 Refrescar"}
          </button>
        </div>
        {dbLoading ? (
          <p className="text-slate-500 text-sm">Cargando desde Supabase…</p>
        ) : dbProp.length > 0 ? (
          <DataTable rows={dbProp} title="" />
        ) : (
          <p className="text-slate-500 text-sm">La BD está vacía. Sube un CSV para comenzar.</p>
        )}
      </div>
    </div>
  );
}
