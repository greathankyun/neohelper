import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPatients, createPatient } from '../api';
import { useAuth } from './AuthContext';
import { ageInDays, formatGa } from '../utils/clinical';

const emptyForm = { identifier: '', gaWeeks: '', gaDays: '0', birthDate: '', birthWeightGrams: '', note: '' };

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
        <form onSubmit={handleSubmit} className="border border-rule bg-white/50 p-3 mb-4 grid sm:grid-cols-3 gap-3">
          <label className="text-sm flex flex-col gap-1">
            床號/代號
            <input
              required
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              className="border border-rule px-2 py-1"
              placeholder="例如 床3-1（請勿填真實姓名/病歷號）"
            />
          </label>
          <label className="text-sm flex flex-col gap-1">
            GA 完整週數
            <input
              required
              type="number"
              value={form.gaWeeks}
              onChange={(e) => setForm({ ...form, gaWeeks: e.target.value })}
              className="border border-rule px-2 py-1 readout"
            />
          </label>
          <label className="text-sm flex flex-col gap-1">
            GA 額外天數 (0-6)
            <input
              type="number"
              min="0"
              max="6"
              value={form.gaDays}
              onChange={(e) => setForm({ ...form, gaDays: e.target.value })}
              className="border border-rule px-2 py-1 readout"
            />
          </label>
          <label className="text-sm flex flex-col gap-1">
            出生日期時間
            <input
              required
              type="datetime-local"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              className="border border-rule px-2 py-1 readout"
            />
          </label>
          <label className="text-sm flex flex-col gap-1">
            出生體重 (g)
            <input
              required
              type="number"
              value={form.birthWeightGrams}
              onChange={(e) => setForm({ ...form, birthWeightGrams: e.target.value })}
              className="border border-rule px-2 py-1 readout"
            />
          </label>
          <label className="text-sm flex flex-col gap-1 sm:col-span-3">
            備註（選填）
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="border border-rule px-2 py-1"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-3 border border-ink bg-ink text-paper px-3 py-1.5 font-medium disabled:opacity-50"
          >
            {saving ? '新增中…' : '新增'}
          </button>
        </form>
      )}

      {patients === null && <div className="text-sm text-ink/50">載入中…</div>}
      {patients?.length === 0 && <div className="text-sm text-ink/50">目前沒有病人資料</div>}

      <div className="space-y-2">
        {patients?.map((p) => {
          const days = ageInDays(p.birthDate);
          return (
            <Link
              key={p.id}
              to={`/patients/${p.id}`}
              className="block border border-rule bg-white/50 hover:bg-white/80 px-4 py-3"
            >
              <div className="flex justify-between items-baseline">
                <span className="font-display font-semibold">{p.identifier}</span>
                <span className="font-mono text-xs text-ink/50">
                  {p.status === 'discharged' ? '已出院' : `日齡 ${days.toFixed(1)} day`}
                </span>
              </div>
              <div className="text-sm text-ink/70 mt-0.5">
                {formatGa(p.gaWeeks, p.gaDays)}／出生體重 {p.birthWeightGrams}g
                {p.latestLog?.weightGrams && `／目前體重 ${p.latestLog.weightGrams}g`}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
