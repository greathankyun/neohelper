import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPatients, createPatient } from '../api';
import { useAuth } from './AuthContext';
import { computeAge, formatGa } from '../utils/clinical';

const emptyForm = {
  identifier: '',
  gaWeeks: '',
  gaDays: '0',
  birthDate: '',
  birthWeightGrams: '',
  edc: '',
  gpa: '',
  deliveryMethod: '',
  apgar1min: '',
  apgar5min: '',
  ropRiskPressor: false,
  ropRiskO2ThreeDays: false,
  ropRiskO2Unmonitored: false,
  synagisCld: false,
  synagisCardiac: false,
  note: '',
};

function Field({ label, children, span }) {
  return (
    <label className={`text-sm flex flex-col gap-1 ${span ? `sm:col-span-${span}` : ''}`}>
      {label}
      {children}
    </label>
  );
}

export default function PatientsList() {
  const { onUnauthorized, logout } = useAuth();
  const [patients, setPatients] = useState(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active');

  async function load() {
    setError('');
    try {
      const data = await listPatients(statusFilter === 'all' ? undefined : statusFilter);
      setPatients(data);
    } catch (e) {
      if (e.status === 401) onUnauthorized();
      else setError(e.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createPatient({
        ...form,
        gaWeeks: Number(form.gaWeeks),
        gaDays: Number(form.gaDays || 0),
        birthWeightGrams: Number(form.birthWeightGrams),
        apgar1min: form.apgar1min === '' ? undefined : Number(form.apgar1min),
        apgar5min: form.apgar5min === '' ? undefined : Number(form.apgar5min),
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'border border-rule px-2 py-1';
  const checkboxRow = 'flex items-center gap-2 text-sm';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">病人追蹤</h1>
        <button onClick={logout} className="text-xs text-ink/50 underline">
          登出
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {[
          { v: 'active', l: '在院' },
          { v: 'discharged', l: '已出院' },
          { v: 'all', l: '全部' },
        ].map((opt) => (
          <button
            key={opt.v}
            onClick={() => setStatusFilter(opt.v)}
            className={`text-sm px-3 py-1 border ${
              statusFilter === opt.v ? 'bg-ink text-paper border-ink' : 'border-rule bg-white/50'
            }`}
          >
            {opt.l}
          </button>
        ))}
        <button
          onClick={() => setShowForm((s) => !s)}
          className="ml-auto text-sm px-3 py-1 border border-alert text-alert bg-alert/5"
        >
          {showForm ? '取消' : '+ 新增病人'}
        </button>
      </div>

      {error && <div className="text-sm text-alert mb-3">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-rule bg-white/50 p-3 mb-4 space-y-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-2">出生史 Birth History</div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="床號/代號">
                <input
                  required
                  value={form.identifier}
                  onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                  className={inputCls}
                  placeholder="例如 床3-1（請勿填真實姓名/病歷號）"
                />
              </Field>
              <Field label="GA 完整週數">
                <input
                  required
                  type="number"
                  value={form.gaWeeks}
                  onChange={(e) => setForm({ ...form, gaWeeks: e.target.value })}
                  className={`${inputCls} readout`}
                />
              </Field>
              <Field label="GA 額外天數 (0-6)">
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={form.gaDays}
                  onChange={(e) => setForm({ ...form, gaDays: e.target.value })}
                  className={`${inputCls} readout`}
                />
              </Field>
              <Field label="出生日期時間（時間選填）">
                <input
                  required
                  type="datetime-local"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className={`${inputCls} readout`}
                />
              </Field>
              <Field label="出生體重 (g)">
                <input
                  required
                  type="number"
                  value={form.birthWeightGrams}
                  onChange={(e) => setForm({ ...form, birthWeightGrams: e.target.value })}
                  className={`${inputCls} readout`}
                />
              </Field>
              <Field label="EDC 預產期（選填）">
                <input
                  type="date"
                  value={form.edc}
                  onChange={(e) => setForm({ ...form, edc: e.target.value })}
                  className={`${inputCls} readout`}
                />
              </Field>
              <Field label="GPA（媽媽孕產次數）">
                <input
                  value={form.gpa}
                  onChange={(e) => setForm({ ...form, gpa: e.target.value })}
                  className={inputCls}
                  placeholder="例如 G2P1A0"
                />
              </Field>
              <Field label="出生方式">
                <select
                  value={form.deliveryMethod}
                  onChange={(e) => setForm({ ...form, deliveryMethod: e.target.value })}
                  className={inputCls}
                >
                  <option value="">未選擇</option>
                  <option value="NSD">NSD</option>
                  <option value="VED">VED</option>
                  <option value="CS">CS</option>
                </select>
              </Field>
              <Field label="Apgar score">
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={form.apgar1min}
                    onChange={(e) => setForm({ ...form, apgar1min: e.target.value })}
                    className={`${inputCls} readout w-full`}
                    placeholder="1min"
                  />
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={form.apgar5min}
                    onChange={(e) => setForm({ ...form, apgar5min: e.target.value })}
                    className={`${inputCls} readout w-full`}
                    placeholder="5min"
                  />
                </div>
              </Field>
            </div>
          </div>

          <div>
            <div className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-2">
              ROP 轉介風險因子（僅 GA 31–34+6 週且出生體重 1501–2000g 時適用）
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className={checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.ropRiskPressor}
                  onChange={(e) => setForm({ ...form, ropRiskPressor: e.target.checked })}
                />
                曾因低血壓使用強心劑
              </label>
              <label className={checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.ropRiskO2ThreeDays}
                  onChange={(e) => setForm({ ...form, ropRiskO2ThreeDays: e.target.checked })}
                />
                出生後曾使用氧氣達3天以上
              </label>
              <label className={checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.ropRiskO2Unmonitored}
                  onChange={(e) => setForm({ ...form, ropRiskO2Unmonitored: e.target.checked })}
                />
                出生後曾使用氧氣且未監測血氧濃度
              </label>
            </div>
          </div>

          <div>
            <div className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-2">Synagis 適應症（醫師判斷）</div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className={checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.synagisCld}
                  onChange={(e) => setForm({ ...form, synagisCld: e.target.checked })}
                />
                符合 CLD/BPD（GA&lt;35週）適應症
              </label>
              <label className={checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.synagisCardiac}
                  onChange={(e) => setForm({ ...form, synagisCardiac: e.target.checked })}
                />
                符合先天性心臟病適應症
              </label>
            </div>
          </div>

          <Field label="備註（選填）">
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className={inputCls}
            />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="w-full border border-ink bg-ink text-paper px-3 py-1.5 font-medium disabled:opacity-50"
          >
            {saving ? '新增中…' : '新增'}
          </button>
        </form>
      )}

      {patients === null && <div className="text-sm text-ink/50">載入中…</div>}
      {patients?.length === 0 && <div className="text-sm text-ink/50">目前沒有病人資料</div>}

      <div className="space-y-2">
        {patients?.map((p) => {
          const age = computeAge(p.gaWeeks, p.gaDays, p.birthDate);
          return (
            <Link
              key={p.id}
              to={`/patients/${p.id}`}
              className="block border border-rule bg-white/50 hover:bg-white/80 px-4 py-3"
            >
              <div className="flex justify-between items-baseline">
                <span className="font-display font-semibold">{p.identifier}</span>
                <span className="font-mono text-xs text-ink/50">
                  {p.status === 'discharged' ? '已出院' : age.label}
                </span>
              </div>
              <div className="text-sm text-ink/70 mt-0.5">
                {formatGa(p.gaWeeks, p.gaDays)}／出生體重 {p.birthWeightGrams}g
                {p.latestRound?.weightGrams && `／目前體重 ${p.latestRound.weightGrams}g`}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
