"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadCSV, resetETL, getPropiedades, getAnuncios, type Reporte } from "@/lib/api";
import ReporteStats from "@/components/etl/ReporteStats";
import DataTable from "@/components/etl/DataTable";
import {
  MdOutlineUploadFile, MdOutlineTableRows, MdDeleteForever,
  MdOutlineRefresh, MdCheckCircleOutline, MdErrorOutline, MdStorage,
} from "react-icons/md";

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

function Spinner({ dark }: { dark?: boolean }) {
  return (
    <span
      className="inline-block w-3.5 h-3.5 border-2 rounded-full animate-spin"
      style={{
        borderColor: dark ? "rgba(13,43,74,0.2)" : "rgba(255,255,255,0.3)",
        borderTopColor: dark ? "var(--primary)" : "#fff",
      }}
    />
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
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold glow-text flex items-center gap-2">
            <MdOutlineTableRows size={26} />
            ETL Propiedades
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Carga y procesa datos de propiedades hacia Supabase
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={resetting || loading}
          className="btn-danger flex items-center gap-2 px-4 py-2 rounded text-sm font-medium"
        >
          <MdDeleteForever size={17} />
          {resetting ? <><Spinner /> Reiniciando…</> : "Reiniciar BD"}
        </button>
      </div>

      {/* ── Upload zone ─────────────────────────────────────────────── */}
      <div className="card p-1">
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className="flex flex-col items-center justify-center gap-3 rounded py-12 cursor-pointer transition-all border-2 border-dashed"
          style={{
            borderColor: dragging
              ? "var(--primary)"
              : loading
              ? "var(--warning)"
              : "var(--border-2)",
            background: dragging ? "#e8eef7" : loading ? "#fef9ec" : "transparent",
          }}
        >
          <div
            className="w-12 h-12 rounded flex items-center justify-center"
            style={{ background: "#e8eef7", color: "var(--primary)" }}
          >
            <MdOutlineUploadFile size={28} />
          </div>
          <div className="text-center">
            <p className="font-medium text-sm" style={{ color: "var(--text)" }}>
              {loading
                ? "Procesando CSV…"
                : "Arrastra tu CSV aquí o haz clic para seleccionar"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Solo archivos .csv</p>
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
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--primary)" }}>
              Historial de cargas
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ background: "#e8eef7", color: "var(--primary)" }}
            >
              {uploads.length}
            </span>
          </div>

          {uploads.map((u, i) => (
            <div
              key={u.id}
              className="card overflow-hidden"
              style={{
                borderLeft: `3px solid ${u.ok ? "#1a7c32" : "#c42400"}`,
              }}
            >
              {/* Card header */}
              <div
                className="flex items-center gap-3 px-5 py-3"
                style={{ borderBottom: "1px solid var(--border)", background: "#f9fafc" }}
              >
                {u.ok
                  ? <MdCheckCircleOutline size={18} color="#1a7c32" />
                  : <MdErrorOutline size={18} color="#c42400" />
                }
                <span className="font-mono text-sm" style={{ color: "var(--text)" }}>{u.filename}</span>
                {i === 0 && (
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded font-medium"
                    style={{ background: "#e8eef7", color: "var(--primary)" }}
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
                      className="text-xs rounded px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1"
                      style={{ background: "#edf7f0", border: "1px solid #b8e0c4" }}
                    >
                      <span style={{ color: "#1a7c32" }}>
                        <strong>{u.reporte.propiedades_nuevas}</strong> props nuevas
                      </span>
                      <span style={{ color: "var(--muted)" }}>
                        <strong>{u.reporte.propiedades_omitidas}</strong> omitidas
                      </span>
                      <span style={{ color: "var(--danger)" }}>
                        <strong>{u.reporte.propiedades_rechazadas}</strong> rechazadas
                      </span>
                      <span style={{ color: "var(--border-2)" }}>·</span>
                      <span style={{ color: "#1a7c32" }}>
                        <strong>{u.reporte.anuncios_nuevos}</strong> anuncios nuevos
                      </span>
                      <span style={{ color: "var(--warning)" }}>
                        <strong>{u.reporte.anuncios_actualizados}</strong> actualizados
                      </span>
                      <span style={{ color: "var(--muted)" }}>
                        <strong>{u.reporte.anuncios_rechazados}</strong> idénticos
                      </span>
                    </div>
                    <DataTable rows={u.preview_propiedades ?? []} title="Preview propiedades" />
                    <DataTable rows={u.preview_anuncios    ?? []} title="Preview anuncios" />
                  </>
                ) : (
                  <p className="text-sm" style={{ color: "var(--danger)" }}>{u.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DB current data ─────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)", background: "#f9fafc" }}
        >
          <div className="flex items-center gap-2">
            <MdStorage size={18} style={{ color: "var(--primary)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
              Datos en Supabase
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ background: "#e8eef7", color: "var(--teal)" }}
            >
              {dbProp.length} props · {dbAnun.length} anuncios
            </span>
          </div>
          <button
            onClick={cargarBD}
            disabled={dbLoading}
            className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
          >
            <MdOutlineRefresh size={15} />
            {dbLoading ? <><Spinner dark /> Cargando…</> : "Refrescar"}
          </button>
        </div>
        <div className="p-5 space-y-4">
          {dbLoading ? (
            <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>Cargando desde Supabase…</p>
          ) : dbProp.length > 0 || dbAnun.length > 0 ? (
            <>
              <DataTable rows={dbProp} title="Propiedades — últimas 20 filas" />
              <DataTable rows={dbAnun} title="Anuncios — últimas 20 filas" />
            </>
          ) : (
            <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>
              La BD está vacía. Sube un CSV para comenzar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
