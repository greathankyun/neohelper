import { useState } from 'react';

function Field({ label, unit, children }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">
        {label} {unit && <span className="text-ink/50 font-normal">({unit})</span>}
      </span>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange, placeholder }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="any"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="readout border border-rule bg-white/70 px-2.5 py-1.5 focus:border-alert outline-none w-full"
    />
  );
}

function Readout({ label, value, unit }) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return (
    <div className="flex items-baseline justify-between border-b border-rule/70 py-1.5 last:border-b-0">
      <span className="text-sm text-ink/70">{label}</span>
      <span className="readout text-lg font-semibold">
        {typeof value === 'number' ? Math.round(value * 100) / 100 : value}
        {unit && <span className="text-sm font-normal text-ink/60 ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function gaGroupIndex(groups, weeksRaw) {
  // GA is conventionally completed weeks + days (e.g. 34+6/7); band boundaries
  // are defined per completed week, so floor before matching.
  const weeks = Math.floor(weeksRaw);
  return groups.findIndex(
    (g) =>
      (g.minWeeks === undefined || weeks >= g.minWeeks) &&
      (g.maxWeeks === undefined || weeks <= g.maxWeeks)
  );
}

function nearestDayIndex(dayColumns, ageDays) {
  let best = 0;
  let bestDiff = Infinity;
  dayColumns.forEach((d, i) => {
    const diff = Math.abs(d - ageDays);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  });
  return best;
}

function BilirubinLookup({ calc }) {
  const [ga, setGa] = useState('');
  const [age, setAge] = useState('');
  const [bili, setBili] = useState('');

  const gaNum = parseFloat(ga);
  const ageNum = parseFloat(age);
  const biliNum = parseFloat(bili);
  const hasGa = !Number.isNaN(gaNum) && gaNum > 0;
  const hasAge = !Number.isNaN(ageNum) && ageNum >= 0;
  const hasBili = !Number.isNaN(biliNum);

  let groupIdx = -1;
  let dayIdx = -1;
  let photo, intensive, exchange;
  if (hasGa && hasAge) {
    groupIdx = gaGroupIndex(calc.gaGroups, gaNum);
    dayIdx = nearestDayIndex(calc.dayColumns, ageNum);
    if (groupIdx >= 0) {
      photo = calc.phototherapy[groupIdx][dayIdx];
      intensive = calc.intensivePhototherapy[groupIdx][dayIdx];
      exchange = calc.exchange[groupIdx][dayIdx];
    }
  }

  let zone = null;
  if (hasBili && photo !== undefined) {
    if (biliNum >= exchange) zone = { label: '已達換血標準', tone: 'alert' };
    else if (biliNum >= intensive) zone = { label: '已達積極照光標準', tone: 'alert' };
    else if (biliNum >= photo) zone = { label: '已達照光標準', tone: 'warn' };
    else if (biliNum >= photo - 2) zone = { label: '接近照光標準（低於照光標準 2 以內）', tone: 'watch' };
    else zone = { label: '未達照光標準', tone: 'ok' };
  }

  const zoneClasses = {
    alert: 'bg-alert/15 border-alert text-alert',
    warn: 'bg-amber-700/15 border-amber-700 text-amber-900',
    watch: 'bg-amber-700/5 border-amber-700/60 text-amber-900',
    ok: 'bg-stable/10 border-stable text-stable',
  };

  return (
    <div className="my-4 border border-rule bg-white/50">
      <div className="px-3 py-2 bg-ink/[0.06] border-b border-rule font-medium text-sm">{calc.title}</div>
      <div className="p-3 grid sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Field label="GA" unit="完整週數">
            <NumberInput value={ga} onChange={setGa} placeholder="例如 34+6/7 週請輸入 34" />
          </Field>
          <Field label="日齡" unit="day">
            <NumberInput value={age} onChange={setAge} placeholder="例如 3.4" />
          </Field>
          <Field label="目前 Bilirubin（選填）" unit="mg/dl">
            <NumberInput value={bili} onChange={setBili} placeholder="例如 12.5" />
          </Field>
        </div>
        <div className="flex flex-col justify-center gap-1">
          {!(hasGa && hasAge) && <div className="text-sm text-ink/50">輸入 GA 與日齡以查詢標準值</div>}
          {hasGa && hasAge && groupIdx < 0 && <div className="text-sm text-ink/50">找不到對應的 GA 分組</div>}
          {hasGa && hasAge && groupIdx >= 0 && (
            <>
              <div className="text-xs text-ink/50 mb-1">
                對應 {calc.gaGroups[groupIdx].label} ／ {calc.dayLabels[dayIdx]}
              </div>
              <Readout label="照光標準" value={photo} unit="mg/dl" />
              <Readout label="積極照光標準" value={intensive} unit="mg/dl" />
              <Readout label="換血標準" value={exchange} unit="mg/dl" />
              {zone && (
                <div className={`mt-2 border-l-4 px-3 py-2 text-sm font-medium ${zoneClasses[zone.tone]}`}>
                  {zone.label}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="px-3 pb-3 text-xs text-ink/60">
        天數選取原則：以最接近者為準，如 3.4 day 用 3 day 之標準，1.2 day 用 1 day 之標準。結果僅供參考，仍須綜合臨床狀況、危險因子判斷。
      </div>
    </div>
  );
}

export default function Calculator({ calc }) {
  if (calc.type === 'bilirubin-lookup') {
    return <BilirubinLookup calc={calc} />;
  }

  const [bw, setBw] = useState('');
  const [term, setTerm] = useState('term');
  const bwNum = parseFloat(bw);
  const hasBw = !Number.isNaN(bwNum) && bwNum > 0;

  return (
    <div className="my-4 border border-rule bg-white/50">
      <div className="px-3 py-2 bg-ink/[0.06] border-b border-rule font-medium text-sm">
        {calc.title || '計算機'}
      </div>
      <div className="p-3 grid sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Field label="體重" unit="kg">
            <NumberInput value={bw} onChange={setBw} placeholder="例如 1.25" />
          </Field>

          {calc.type === 'exchange-volume' && (
            <Field label="足月 / 早產">
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="border border-rule bg-white/70 px-2.5 py-1.5 outline-none focus:border-alert"
              >
                <option value="term">足月兒 (80 ml/kg)</option>
                <option value="preterm">早產兒 (100 ml/kg)</option>
              </select>
            </Field>
          )}
        </div>

        <div className="flex flex-col justify-center">
          {!hasBw && <div className="text-sm text-ink/50">輸入體重以顯示計算結果</div>}

          {hasBw && calc.type === 'exchange-volume' && (
            <Readout
              label={calc.resultLabel}
              value={bwNum * (term === 'preterm' ? 100 : 80) * 2}
              unit={calc.resultUnit}
            />
          )}

          {hasBw && calc.type === 'tpn-electrolyte' && (
            <div>
              {Object.entries(calc.baseline).map(([k, v]) => (
                <Readout key={k} label={k} value={bwNum * v} unit={k === 'P' ? 'mmol' : 'mEq'} />
              ))}
            </div>
          )}

          {hasBw && calc.type === 'per-kg' && (
            <Readout label="劑量" value={bwNum * calc.factor} unit={calc.unit} />
          )}

          {hasBw && calc.type === 'per-kg-range' && (
            <Readout
              label="劑量範圍"
              value={`${Math.round(bwNum * calc.min * 100) / 100}–${Math.round(bwNum * calc.max * 100) / 100}`}
              unit={calc.unit}
            />
          )}

          {hasBw && calc.type === 'loading-maintenance' && (
            <div>
              <Readout label="Loading" value={bwNum * calc.loadingFactor} unit={calc.unit} />
              <Readout label="Maintenance" value={bwNum * calc.maintenanceFactor} unit={calc.unit} />
            </div>
          )}

          {hasBw && calc.type === 'day-tier' && (
            <div>
              <Readout label="Day 1" value={bwNum * calc.day1Factor} unit={calc.unit} />
              <Readout label="Day 2–3" value={bwNum * calc.day2to3Factor} unit={calc.unit} />
            </div>
          )}

          {hasBw && calc.type === 'bbw-tier' && (
            <div>
              {(() => {
                const g = bwNum * 1000; // input is kg, tiers are in grams (BBW)
                const tier = calc.tiers.find((t) => g >= t.min && (t.max === null || t.max === undefined || g <= t.max));
                return tier ? (
                  <Readout label="建議劑量" value={tier.dose} unit={calc.unit} />
                ) : (
                  <div className="text-sm text-ink/50">找不到對應體重區間</div>
                );
              })()}
              <div className="text-xs text-ink/50 mt-1">＊此計算機以「出生體重（BBW）」為輸入，請確認上方輸入的是出生體重</div>
            </div>
          )}
        </div>
      </div>
      {calc.unitNote && <div className="px-3 pb-3 text-xs text-ink/60">{calc.unitNote}</div>}
      {calc.note && <div className="px-3 pb-3 text-xs text-ink/60">{calc.note}</div>}
    </div>
  );
}
