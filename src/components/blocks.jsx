export function Callout({ label, children, tone = 'neutral' }) {
  const toneClasses = {
    neutral: 'border-ink/30 bg-ink/[0.03]',
    warning: 'border-alert bg-alert/[0.06]',
  };
  return (
    <div className={`border-l-4 pl-4 pr-3 py-2.5 my-3 text-[0.95rem] leading-relaxed ${toneClasses[tone]}`}>
      {label && <div className="font-mono text-xs uppercase tracking-wide text-ink/60 mb-1">{label}</div>}
      <div>{children}</div>
    </div>
  );
}

export function PointList({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-1.5 my-2">
      {items.map((p, i) => (
        <li key={i} className="flex gap-2.5 leading-relaxed">
          <span className="text-ink/40 select-none mt-[2px]">—</span>
          <span>{p}</span>
        </li>
      ))}
    </ul>
  );
}

export function DataTable({ table }) {
  if (!table) return null;
  return (
    <div className="my-3 overflow-x-auto border border-rule">
      {table.caption && (
        <div className="px-3 py-1.5 text-sm font-medium bg-ink/[0.04] border-b border-rule">{table.caption}</div>
      )}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-ink/[0.06]">
            {table.columns.map((c, i) => (
              <th key={i} className="text-left font-medium px-3 py-2 border-b border-rule whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 1 ? 'bg-ink/[0.02]' : ''}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 border-b border-rule/70 align-top font-mono text-[0.9rem]">
                  {cell === '' || cell === null || cell === undefined ? '—' : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.note && <div className="px-3 py-1.5 text-xs text-ink/60 border-t border-rule">{table.note}</div>}
    </div>
  );
}

export function TwoColumnList({ columns }) {
  if (!columns?.length) return null;
  return (
    <div className="grid sm:grid-cols-2 gap-4 my-2">
      {columns.map((col, i) => (
        <div key={i}>
          {col.heading && <div className="font-medium text-sm mb-1.5">{col.heading}</div>}
          <PointList items={col.items} />
        </div>
      ))}
    </div>
  );
}

export function FlowBlock({ flow }) {
  if (!flow?.length) return null;
  return (
    <div className="my-3 space-y-2">
      {flow.map((item, i) => (
        <div key={i} className="border border-rule bg-white/40">
          {(item.branch || item.condition || item.step) && (
            <div className="px-3 py-1.5 bg-ink/[0.06] text-sm font-medium border-b border-rule">
              {item.branch || item.condition || item.step}
            </div>
          )}
          <div className="px-3 py-2 text-[0.95rem] leading-relaxed space-y-1.5">
            {item.result && <div>→ {item.result}</div>}
            {item.next && <div className="text-ink/70 italic">下一步：{item.next}</div>}
            {item.exception && (
              <div className="text-sm border-l-2 border-stable pl-2 text-ink/80">例外：{item.exception}</div>
            )}
            {item.causes && (
              <div className="flex flex-wrap gap-1.5">
                {item.causes.map((c, ci) => (
                  <span key={ci} className="text-xs border border-rule px-1.5 py-0.5 bg-ink/[0.03]">
                    {c}
                  </span>
                ))}
              </div>
            )}
            {item.paths && (
              <div className="space-y-1.5 mt-1">
                {item.paths.map((p, pi) => (
                  <div key={pi} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 pl-2 border-l-2 border-ink/20">
                    <span className="font-mono text-xs text-ink/60 whitespace-nowrap">{p.condition}</span>
                    <span>{p.result}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkupOrders({ workupOrders }) {
  if (!workupOrders?.length) return null;
  return (
    <div className="my-3 space-y-3">
      {workupOrders.map((w, i) => (
        <div key={i} className="border border-rule">
          <div className="px-3 py-1.5 bg-ink/[0.06] text-sm font-medium border-b border-rule">{w.trigger}</div>
          <div className="px-3 py-2">
            <PointList items={w.orders} />
          </div>
        </div>
      ))}
    </div>
  );
}
