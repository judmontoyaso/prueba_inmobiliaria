import type { Reporte } from "@/lib/api";

const STATS: { key: keyof Reporte; label: string; color: string; accent: string }[] = [
  { key: "filas_crudas",           label: "Filas crudas",         color: "text-slate-300",  accent: "rgba(148,163,184,0.6)" },
  { key: "duplicados",             label: "Duplicados",           color: "text-yellow-400", accent: "rgba(251,191,36,0.6)" },
  { key: "propiedades_validas",    label: "Props válidas",        color: "text-indigo-300", accent: "rgba(129,140,248,0.6)" },
  { key: "propiedades_nuevas",     label: "Props nuevas",         color: "text-emerald-400",accent: "rgba(52,211,153,0.6)" },
  { key: "propiedades_omitidas",   label: "Props omitidas",       color: "text-slate-400",  accent: "rgba(100,116,139,0.6)" },
  { key: "propiedades_rechazadas", label: "Props rechazadas",     color: "text-red-400",    accent: "rgba(248,113,113,0.6)" },
  { key: "anuncios_validos",       label: "Anuncios procesados",  color: "text-cyan-300",   accent: "rgba(34,211,238,0.6)" },
  { key: "anuncios_nuevos",        label: "Anuncios nuevos",      color: "text-emerald-400",accent: "rgba(52,211,153,0.6)" },
  { key: "anuncios_actualizados",  label: "Actualizados",         color: "text-yellow-400", accent: "rgba(251,191,36,0.6)" },
  { key: "anuncios_rechazados",    label: "Idénticos",            color: "text-slate-500",  accent: "rgba(100,116,139,0.5)" },
  { key: "metraje_nulo",           label: "Metraje nulo",         color: "text-orange-400", accent: "rgba(251,146,60,0.6)" },
  { key: "precio_nulo",            label: "Precio nulo",          color: "text-orange-400", accent: "rgba(251,146,60,0.6)" },
  { key: "sin_tipo",               label: "Sin tipo",             color: "text-slate-400",  accent: "rgba(100,116,139,0.5)" },
];

export default function ReporteStats({ reporte }: { reporte: Reporte }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
      {STATS.map(({ key, label, color, accent }) => (
        <div
          key={key}
          className="glass stat-card"
          style={{ borderTop: `2px solid ${accent}` }}
        >
          <p className={`text-2xl font-bold ${color}`}>
            {(reporte[key] ?? 0).toLocaleString("es-CO")}
          </p>
          <p className="text-xs text-slate-500 mt-1 leading-tight">{label}</p>
        </div>
      ))}
    </div>
  );
}
