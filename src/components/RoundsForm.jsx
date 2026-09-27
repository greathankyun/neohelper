import { useState } from 'react';
import { upsertRound } from '../api';
import { computeOtdf } from '../utils/reminders';

const RESP_OPTIONS = ['RA', 'NCPAP', 'NIPPV', 'SIMV', 'SIMV+PS', 'HFOV'];
const FEEDING_TYPES = ['NPO', 'BM', 'IF', 'PDF', '(22)PF', '(24)PF', 'BM+HMF(50)', 'BM+HMF(25)'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function buildInitial(prev) {
  return {
    recordDate: today(),
    weightGrams: '',
    respMode: prev?.respMode || 'RA',
    respNote: prev?.respMode ? prev.respNote || '' : '',
    feedingRoute: prev?.feedingRoute || 'PO',
    feedingMode: prev?.feedingMode || 'single',
    feedingTypeA: prev?.feedingTypeA || 'BM',
    feedingTypeB: prev?.feedingTypeB || '',
    feedingSplitA: prev?.feedingSplitA ?? '',
    feedingSplitB: prev?.feedingSplitB ?? '',
    feedingVolPerFeed: prev?.feedingVolPerFeed ?? '',
    feedingFrequency: prev?.feedingFrequency || 'Q3H',
    tdfOrdered: prev?.tdfOrdered ?? '',
    tpnActive: prev?.tpnActive || false,
    diagnosis: prev?.diagnosis || '',
    labs: '',
    note: '',
  };
}

export default function RoundsForm({ patientId, birthWeightGrams, mostRecentRound, onSaved }) {
  const [form, setForm] = useState(() => buildInitial(mostRecentRound));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const otdfPreview = computeOtdf(
    { weightGrams: form.weightGrams ? Number(form.weightGrams) : null, feedingVolPerFeed: Number(form.feedingVolPerFeed) || null, feedingFrequency: form.feedingFrequency },
    birthWeightGrams
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await upsertRound(patientId, form.recordDate, {
        ...form,
        weightGrams: form.weightGrams === '' ? undefined : Number(form.weightGrams),
        feedingSplitA: form.feedingSplitA === '' ? undefined : Number(form.feedingSplitA),
        feedingSplitB: form.feedingSplitB === '' ? undefined : Number(form.feedingSplitB),
        feedingVolPerFeed: form.feedingVolPerFeed === '' ? undefined : Number(form.feedingVolPerFeed),
        tdfOrdered: form.tdfOrdered === '' ? undefined : Number(form.tdfOrdered),
      });
      onSaved();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'border border-rule px-2 py-1 text-sm';

  return (
    <form onSubmit={handleSubmit} className="border border-rule bg-white/50 p-3 space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm flex items-center gap-2">
          日期
          <input
            type="date"
            value={form.recordDate}
            onChange={(e) => setForm({ ...form, recordDate: e.target.value })}
            className={`${inputCls} readout`}
          />
        </label>
        <span className="text-xs text-ink/50">已自動帶入前一筆紀錄，可直接修改</span>
      </div>

      <label className="text-sm flex flex-col gap-1 max-w-[10rem]">
        體重 (g)
        <input
          type="number"
          value={form.weightGrams}
          onChange={(e) => setForm({ ...form, weightGrams: e.target.value })}
          className={`${inputCls} readout`}
        />
      </label>

      <div>
        <div className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-1.5">呼吸支持</div>
        <div className="flex flex-wrap gap-3 items-end">
          <select
            value={form.respMode}
            onChange={(e) => setForm({ ...form, respMode: e.target.value })}
            className={inputCls}
          >
            {RESP_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <input
            value={form.respNote}
            onChange={(e) => setForm({ ...form, respNote: e.target.value })}
            placeholder="設定備註，例如 15/5,25,0.21"
            className={`${inputCls} flex-1 min-w-[180px]`}
          />
        </div>
      </div>

      <div>
        <div className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-1.5">Feeding</div>
        <div className="flex flex-wrap gap-3 items-end mb-2">
          <select
            value={form.feedingRoute}
            onChange={(e) => setForm({ ...form, feedingRoute: e.target.value })}
            className={inputCls}
          >
            <option value="PO">PO</option>
            <option value="OG">OG</option>
            <option value="PO+OG">PO+OG</option>
          </select>
          <select
            value={form.feedingMode}
            onChange={(e) => setForm({ ...form, feedingMode: e.target.value })}
            className={inputCls}
          >
            <option value="single">單一種</option>
            <option value="alternating">交替喝</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-3 items-end mb-2">
          <select
            value={form.feedingTypeA}
            onChange={(e) => setForm({ ...form, feedingTypeA: e.target.value })}
            className={inputCls}
          >
            {FEEDING_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {form.feedingMode === 'alternating' && (
            <>
              <span className="text-sm text-ink/50">/</span>
              <select
                value={form.feedingTypeB}
                onChange={(e) => setForm({ ...form, feedingTypeB: e.target.value })}
                className={inputCls}
              >
                <option value="">選擇第二種</option>
                {FEEDING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={form.feedingSplitA}
                onChange={(e) => setForm({ ...form, feedingSplitA: e.target.value })}
                placeholder={`${form.feedingTypeA} 餐數`}
                className={`${inputCls} readout w-28`}
              />
              <input
                type="number"
                value={form.feedingSplitB}
                onChange={(e) => setForm({ ...form, feedingSplitB: e.target.value })}
                placeholder={`${form.feedingTypeB || '第二種'} 餐數`}
                className={`${inputCls} readout w-28`}
              />
              <span className="text-xs text-ink/50">留白＝各半</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <input
            type="number"
            value={form.feedingVolPerFeed}
            onChange={(e) => setForm({ ...form, feedingVolPerFeed: e.target.value })}
            placeholder="每餐量 (ml)"
            className={`${inputCls} readout w-32`}
          />
          <select
            value={form.feedingFrequency}
            onChange={(e) => setForm({ ...form, feedingFrequency: e.target.value })}
            className={inputCls}
          >
            <option value="Q3H">Q3H（8餐）</option>
            <option value="Q4H">Q4H（6餐）</option>
          </select>
          {otdfPreview != null && (
            <span className="text-sm readout">
              oTDF ≈ <strong>{otdfPreview.toFixed(1)}</strong> ml/kg/day
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <label className="text-sm flex flex-col gap-1">
          TDF 醫囑值 (ml/kg/day)
          <input
            type="number"
            value={form.tdfOrdered}
            onChange={(e) => setForm({ ...form, tdfOrdered: e.target.value })}
            className={`${inputCls} readout w-40`}
          />
        </label>
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.tpnActive}
            onChange={(e) => setForm({ ...form, tpnActive: e.target.checked })}
          />
          今日使用 TPN
        </label>
      </div>

      <label className="text-sm flex flex-col gap-1">
        診斷
        <textarea
          value={form.diagnosis}
          onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
          className={`${inputCls} min-h-[3rem]`}
        />
      </label>
      <label className="text-sm flex flex-col gap-1">
        檢驗檢查
        <textarea
          value={form.labs}
          onChange={(e) => setForm({ ...form, labs: e.target.value })}
          className={`${inputCls} min-h-[3rem]`}
        />
      </label>
      <label className="text-sm flex flex-col gap-1">
        備註
        <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputCls} />
      </label>

      {error && <div className="text-sm text-alert">{error}</div>}

      <button
        type="submit"
        disabled={saving}
        className="w-full border border-ink bg-ink text-paper px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {saving ? '儲存中…' : '儲存今日查房紀錄'}
      </button>
    </form>
  );
}
