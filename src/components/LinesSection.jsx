import { useState } from 'react';
import { addLine, removeLine, deleteLine } from '../api';
import { formatDate } from '../utils/clinical';

const LINE_SITES = {
  AL: ['RA', 'LA', 'RL', 'LL'],
  PICC: ['RA', 'LA', 'RL', 'LL'],
  UA: [],
  UV: [],
  CVC: ['RIJV', 'LIJV', 'RF', 'LF'],
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function LinesSection({ patientId, lines, onChanged }) {
  const [lineType, setLineType] = useState('AL');
  const [site, setSite] = useState('');
  const [startDate, setStartDate] = useState(today());
  const [error, setError] = useState('');

  const sites = LINE_SITES[lineType];

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await addLine(patientId, { lineType, site: site || null, startDate });
      setSite('');
      onChanged();
    } catch (e2) {
      setError(e2.message);
    }
  }

  async function handleRemove(lineId) {
    try {
      await removeLine(lineId, today());
      onChanged();
    } catch (e2) {
      setError(e2.message);
    }
  }

  async function handleDelete(lineId) {
    try {
      await deleteLine(lineId);
      onChanged();
    } catch (e2) {
      setError(e2.message);
    }
  }

  const inputCls = 'border border-rule px-2 py-1 text-sm';

  return (
    <div className="border border-rule bg-white/50 p-3">
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-end mb-3">
        <select
          value={lineType}
          onChange={(e) => {
            setLineType(e.target.value);
            setSite('');
          }}
          className={inputCls}
        >
          {Object.keys(LINE_SITES).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {sites.length > 0 && (
          <select value={site} onChange={(e) => setSite(e.target.value)} className={inputCls}>
            <option value="">選擇部位</option>
            {sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className={`${inputCls} readout`}
        />
        <button type="submit" className="border border-ink bg-ink text-paper px-3 py-1 text-sm">
          + 新增管路
        </button>
      </form>

      {error && <div className="text-sm text-alert mb-2">{error}</div>}

      {lines.length === 0 && <div className="text-sm text-ink/50">目前沒有管路紀錄</div>}
      <div className="space-y-1.5">
        {lines.map((l) => (
          <div key={l.id} className="flex items-center justify-between text-sm border-b border-rule/60 pb-1.5">
            <span>
              <span className="font-medium">{l.lineType}</span>
              {l.site && ` (${l.site})`} <span className="readout text-ink/60">{formatDate(l.startDate)} – {l.endDate ? formatDate(l.endDate) : '使用中'}</span>
            </span>
            <span className="flex gap-2 shrink-0">
              {!l.endDate && (
                <button onClick={() => handleRemove(l.id)} className="text-xs text-alert underline">
                  標記移除
                </button>
              )}
              <button onClick={() => handleDelete(l.id)} className="text-xs text-ink/40 underline">
                刪除
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
