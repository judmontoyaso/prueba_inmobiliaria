type Row = Record<string, unknown>;

export default function DataTable({ rows, title }: { rows: Row[]; title: string }) {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              {keys.map((k) => (
                <th
                  key={k}
                  className="text-left pb-2 pr-4 text-slate-400 font-medium uppercase tracking-wide whitespace-nowrap"
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
                className="border-t hover:bg-indigo-900/10 transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                {keys.map((k) => (
                  <td key={k} className="py-1.5 pr-4 whitespace-nowrap">
                    {String(row[k] ?? "")}
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
