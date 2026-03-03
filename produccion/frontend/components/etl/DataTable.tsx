type Row = Record<string, unknown>;

function cell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function DataTable({ rows, title }: { rows: Row[]; title: string }) {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">{title}</span>
        <span
          className="ml-auto text-xs px-2 py-0.5 rounded-full"
          style={{ background: "rgba(129,140,248,0.15)", color: "#a5b4fc" }}
        >
          {rows.length} filas
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
              {keys.map((k) => (
                <th
                  key={k}
                  className="text-left px-4 py-2 text-slate-500 font-medium uppercase tracking-wider whitespace-nowrap"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="transition-colors"
                style={{ borderBottom: "1px solid var(--border)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(129,140,248,0.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {keys.map((k) => (
                  <td key={k} className="px-4 py-2 text-slate-300 whitespace-nowrap">
                    {cell(row[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
