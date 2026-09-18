// The table-view twin every chart carries — the WCAG-clean equivalent of the
// visualization. Collapsed by default so the page stays quiet.

export function TableView({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <details className="mt-3 group">
      <summary className="text-[11.5px] text-muted-foreground cursor-pointer select-none hover:text-foreground w-fit">
        View as table
      </summary>
      <div className="mt-2 overflow-x-auto rounded-lg border">
        <table className="w-full text-[12px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              {columns.map((c) => (
                <th
                  key={c}
                  className="px-2.5 py-1.5 font-medium text-muted-foreground whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                {r.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-2.5 py-1.5 whitespace-nowrap ${
                      j === 0 ? "capitalize" : "tabular-nums"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
