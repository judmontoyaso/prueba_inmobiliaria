import type { Reporte } from "@/lib/api";

const STATS: { key: keyof Reporte; label: string }[] = [
  { key: "filas_crudas",            label: "Filas crudas" },
  { key: "duplicados",              label: "Duplicados" },
  { key: "propiedades_validas",     label: "Propiedades ✓" },
  { key: "propiedades_rechazadas",  label: "Rechazadas" },
  { key: "anuncios_validos",        label: "Anuncios ✓" },
  { key: "metraje_nulo",            label: "Metraje nulo" },
  { key: "precio_nulo",             label: "Precio nulo" },
  { key: "sin_tipo",                label: "Sin tipo" },
];

export default function ReporteStats({ reporte }: { reporte: Reporte }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {STATS.map(({ key, label }) => (
        <div
          key={key}
          className="rounded-xl p-4 text-center"
          style={{ background: "var(--bg)" }}
        >
          <p className="text-2xl font-bold text-indigo-400">
            {reporte[key].toLocaleString("es-CO")}
          </p>
          <p className="text-xs text-slate-400 mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}
