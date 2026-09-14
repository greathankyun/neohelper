import { Callout, PointList, DataTable, FlowBlock, TwoColumnList, WorkupOrders } from './blocks';
import Calculator from './Calculator';

function DrugTiers({ tiers }) {
  if (!tiers?.length) return null;
  return (
    <div className="my-2 divide-y divide-rule/70 border border-rule">
      {tiers.map((t, i) => (
        <div key={i} className="flex justify-between px-3 py-1.5 text-sm">
          <span>{t.condition}</span>
          <span className="readout font-medium">{t.dose}</span>
        </div>
      ))}
    </div>
  );
}

function DoseLine({ label, spec }) {
  if (!spec) return null;
  if (typeof spec === 'string') {
    return (
      <div className="text-sm">
        <span className="font-medium">{label}：</span>
        {spec}
      </div>
    );
  }
  return (
    <div className="text-sm">
      <span className="font-medium">{label}：</span>
      <span className="readout">{spec.dose}</span>
      {spec.unit ? ` ${spec.unit}` : ''}
      {spec.diluent ? `，${spec.diluent}` : ''}
    </div>
  );
}

function Regimen({ regimen }) {
  if (!regimen?.length) return null;
  return (
    <div className="my-2 border border-rule">
      {regimen.map((r, i) => (
        <div key={i} className="flex flex-col sm:flex-row sm:justify-between px-3 py-1.5 text-sm border-b border-rule/70 last:border-b-0">
          <span className="font-medium">{r.drug}</span>
          <span className="text-ink/80">{r.dose}</span>
        </div>
      ))}
    </div>
  );
}

export default function SectionBlock({ section }) {
  return (
    <div className="mb-6">
      {section.title && <h3 className="font-display text-lg font-semibold mb-1.5">{section.title}</h3>}

      {section.subtitle && <p className="text-sm text-ink/70 mb-2">{section.subtitle}</p>}
      {section.description && <p className="leading-relaxed mb-2">{section.description}</p>}
      {section.criteria && (
        <Callout label="適用條件">{section.criteria}</Callout>
      )}
      {section.caveat && <Callout label="限制">{section.caveat}</Callout>}
      {section.indication && <p className="text-sm text-ink/80 mb-2">適應症：{section.indication}</p>}
      {section.trigger && <Callout label="觸發條件">{section.trigger}</Callout>}

      <PointList items={section.points} />
      <PointList items={section.items} />
      {section.steps && (
        <ol className="list-decimal list-inside space-y-1.5 my-2 marker:text-ink/50 marker:font-mono">
          {section.steps.map((s, i) => (
            <li key={i} className="leading-relaxed pl-1">
              {s}
            </li>
          ))}
        </ol>
      )}

      {section.dose && <DoseLine label="劑量" spec={section.dose} />}
      <DoseLine label="Loading" spec={section.loading} />
      <DoseLine label="Maintenance" spec={section.maintenance} />
      <DoseLine label="PO" spec={section.po} />
      {section.conversion && <p className="readout text-sm my-1">{section.conversion}</p>}
      {section.range && <p className="text-sm text-ink/80 mb-1">範圍：{section.range}</p>}
      <DrugTiers tiers={section.tiers} />
      <Regimen regimen={section.regimen} />
      {section.alternative && <Callout label="替代方案">{section.alternative}</Callout>}

      {section.sourceNote && <PointList items={section.sourceNote} />}
      {section.calorieTarget && <p className="text-sm font-medium mt-1">{section.calorieTarget}</p>}

      <DataTable table={section.table} />
      <DataTable table={section.table2} />
      <DataTable table={section.table3} />
      <DataTable table={section.gradeTable} />
      <DataTable table={section.bpTable} />
      <TwoColumnList columns={section.twoColumnList} />
      {section.zoneNote && <Callout label="Zone 定義">{section.zoneNote}</Callout>}

      <FlowBlock flow={section.flow} />
      <WorkupOrders workupOrders={section.workupOrders} />

      {section.note && <Callout label="備註">{section.note}</Callout>}

      {section.calculator && <Calculator calc={section.calculator} />}
    </div>
  );
}
