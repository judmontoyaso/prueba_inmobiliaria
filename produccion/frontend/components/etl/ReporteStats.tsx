import type { Reporte } from "@/lib/api";

const STATS: { key: keyof Reporte; label: string; color?: string }[] = [
  { key: "filas_crudas",             label: "Filas crudas" },
  { key: "duplicados",               label: "Duplicados" },
  { key: "propiedades_validas",      label: "Props válidas" },
  { key: "propiedades_nuevas",       label: "Props nuevas",        color: "text-green-400" },
  { key: "propiedades_omitidas",     label: "Props omitidas",     color: "text-slate-400" },
  { key: "propiedades_rechazadas",   label: "Props rechazadas",    color: "text-red-400" },
  { key: "anuncios_validos",         label: "Anuncios procesados" },
  { key: "anuncios_nuevos",          label: "Anuncios nuevos",     color: "text-green-400" },
  { key: "anuncios_actualizados",    label: "Anuncios actualizados", color: "text-yellow-400" },
  { key: "anuncios_rechazados",      label: "Anuncios idénticos",   color: "text-slate-500" },
  { key: "metraje_nulo",             label: "Metraje nulo" },
  { key: "precio_nulo",              label: "Precio nulo" },
  { key: "sin_tipo",                 label: "Sin tipo" },
];

export default function ReporteStats({ reporte }: { reporte: Reporte }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {STATS.map(({ key, label, color }) => (
        <div
          key={key}
          className="rounded-xl p-4 text-center"
          style={{ background: "var(--bg)" }}
        >
          <p className={`text-2xl font-bold ${color ?? "text-indigo-400"}`}>
            {(reporte[key] ?? 0).toLocaleString("es-CO")}
          </p>
          <p className="text-xs text-slate-400 mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}
