"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadCSV, resetETL, getPropiedades, getAnuncios, type Reporte } from "@/lib/api";
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

/* ── tiny Spinner ─────────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <span className="inline-block w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
  );
}

export default function ETLPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading]     = useState(false);
  const [dragging, setDragging]   = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploads, setUploads]     = useState<UploadResult[]>([]);
  const [dbProp, setDbProp]       = useState<Row[]>([]);
  const [dbAnun, setDbAnun]       = useState<Row[]>([]);
  const [dbLoading, setDbLoading] = useState(false);

  const cargarBD = useCallback(async () => {
    setDbLoading(true);
    try {
      const [rp, ra] = await Promise.all([getPropiedades(20), getAnuncios(20)]);
      setDbProp(rp.data);
      setDbAnun(ra.data);
    } catch { /* silencioso */ }
    finally { setDbLoading(false); }
  }, []);

  useEffect(() => { cargarBD(); }, [cargarBD]);

  const handleReset = useCallback(async () => {
    if (!confirm("¿Seguro? Esto borrará TODAS las propiedades y anuncios de la BD.")) return;
    setResetting(true);
    try {
      await resetETL();
      setUploads([]);
      setDbProp([]);
      setDbAnun([]);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al reiniciar");
    } finally {
      setResetting(false);
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) { alert("Solo se aceptan archivos .csv"); return; }
    if (inputRef.current) inputRef.current.value = "";
    const id = Date.now();
    setLoading(true);
    try {
      const data = await uploadCSV(file);
      setUploads((prev) => [{
        id, filename: file.name, ok: true,
        reporte: data.reporte,
        preview_propiedades: data.preview_propiedades,
        preview_anuncios: data.preview_anuncios,
      }, ...prev]);
      cargarBD();
    } catch (e: unknown) {
      setUploads((prev) => [{
        id, filename: file.name, ok: false,
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
    <div className="space-y-7">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold glow-text">ETL Propiedades</h1>
          <p className="text-slate-500 text-sm mt-1">
            Carga y procesa datos de propiedades hacia Supabase
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={resetting || loading}
          className="btn-danger px-4 py-2 rounded-xl text-sm font-medium"
        >
          {resetting ? <span className="flex items-center gap-2"><Spinner /> Reiniciando…</span> : "🗑️ Reiniciar BD"}
        </button>
      </div>

      {/* ── Upload zone ─────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-1">
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className="flex flex-col items-center justify-center gap-3 rounded-xl py-12 cursor-pointer transition-all border-2 border-dashed"
          style={{
            borderColor: dragging
              ? "var(--primary)"
              : loading
              ? "rgba(251,191,36,0.5)"
              : "rgba(255,255,255,0.1)",
            background: dragging
              ? "rgba(99,102,241,0.06)"
              : loading
              ? "rgba(251,191,36,0.04)"
              : "transparent",
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(34,211,238,0.15))",
              border: "1px solid rgba(129,140,248,0.3)",
            }}
          >
            {loading ? "⏳" : "📄"}
          </div>
          <div className="text-center">
            <p className="font-medium text-sm text-slate-200">
              {loading
                ? "Procesando CSV…"
                : "Arrastra tu CSV aquí o haz clic para seleccionar"}
            </p>
            <p className="text-slate-600 text-xs mt-1">Solo archivos .csv</p>
          </div>
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

      {/* ── Upload history ──────────────────────────────────────────── */}
      {uploads.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Historial de cargas
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(129,140,248,0.15)", color: "#a5b4fc" }}
            >
              {uploads.length}
            </span>
          </div>

          {uploads.map((u, i) => (
            <div
              key={u.id}
              className="glass rounded-2xl overflow-hidden"
              style={{
                borderLeft: u.ok
                  ? "3px solid rgba(52,211,153,0.6)"
                  : "3px solid rgba(248,113,113,0.6)",
              }}
            >
              {/* Card header */}
              <div
                className="flex items-center gap-3 px-5 py-3"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span className="text-base">{u.ok ? "✅" : "❌"}</span>
                <span className="font-mono text-sm text-slate-200">{u.filename}</span>
                {i === 0 && (
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(129,140,248,0.15)", color: "#a5b4fc" }}
                  >
                    última
                  </span>
                )}
              </div>

              {/* Card body */}
              <div className="p-5 space-y-4">
                {u.ok && u.reporte ? (
                  <>
                    <ReporteStats reporte={u.reporte} />
                    <div
                      className="text-xs rounded-xl px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1"
                      style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.18)" }}
                    >
                      <span className="text-emerald-400">
                        <strong>{u.reporte.propiedades_nuevas}</strong> props nuevas
                      </span>
                      <span className="text-slate-400">
                        <strong>{u.reporte.propiedades_omitidas}</strong> omitidas
                      </span>
                      <span className="text-red-400">
                        <strong>{u.reporte.propiedades_rechazadas}</strong> rechazadas
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="text-emerald-400">
                        <strong>{u.reporte.anuncios_nuevos}</strong> anuncios nuevos
                      </span>
                      <span className="text-yellow-400">
                        <strong>{u.reporte.anuncios_actualizados}</strong> actualizados
                      </span>
                      <span className="text-slate-500">
                        <strong>{u.reporte.anuncios_rechazados}</strong> idénticos
                      </span>
                    </div>
                    <DataTable rows={u.preview_propiedades ?? []} title="🏗️ Preview propiedades" />
                    <DataTable rows={u.preview_anuncios    ?? []} title="💰 Preview anuncios" />
                  </>
                ) : (
                  <p className="text-sm text-red-400">{u.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DB current data ─────────────────────────────────────────── */}
      <div className="glass rounded-2xl overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🗄️</span>
            <h2 className="text-sm font-semibold text-slate-200">
              Datos en Supabase
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(34,211,238,0.12)", color: "#67e8f9" }}
            >
              {dbProp.length} props · {dbAnun.length} anuncios
            </span>
          </div>
          <button
            onClick={cargarBD}
            disabled={dbLoading}
            className="btn-ghost px-3 py-1.5 rounded-lg text-xs font-medium"
          >
            {dbLoading ? <span className="flex items-center gap-1.5"><Spinner /> Cargando…</span> : "🔄 Refrescar"}
          </button>
        </div>
        <div className="p-5 space-y-4">
          {dbLoading ? (
            <p className="text-slate-600 text-sm text-center py-4">Cargando desde Supabase…</p>
          ) : dbProp.length > 0 || dbAnun.length > 0 ? (
            <>
              <DataTable rows={dbProp} title="🏗️ Propiedades — últimas 20 filas" />
              <DataTable rows={dbAnun} title="💰 Anuncios — últimas 20 filas" />
            </>
          ) : (
            <p className="text-slate-600 text-sm text-center py-4">
              La BD está vacía. Sube un CSV para comenzar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
