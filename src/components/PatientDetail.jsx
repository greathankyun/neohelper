import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPatient, addLog, deleteLog, updatePatient, deletePatient } from '../api';
import { useAuth } from './AuthContext';
import { ageInDays, formatDate, formatGa } from '../utils/clinical';
import jaundiceData from '../data/jaundice.json';
import tpnData from '../data/tpn.json';

const bilCalc = jaundiceData.sections.find((s) => s.id === 'bilirubin-standards').calculator;
const tpnCalc = tpnData.sections.find((s) => s.calculator)?.calculator;

function gaGroupIndex(groups, weeksRaw) {
  const weeks = Math.floor(weeksRaw);
  return groups.findIndex(
    (g) => (g.minWeeks === undefined || weeks >= g.minWeeks) && (g.maxWeeks === undefined || weeks <= g.maxWeeks)
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

const emptyLog = { logDate: new Date().toISOString().slice(0, 10), weightGrams: '', tdfMlKgDay: '', feedingMl: '', note: '' };

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { onUnauthorized } = useAuth();
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState('');
  const [logForm, setLogForm] = useState(emptyLog);
  const [saving, setSaving] = useState(false);
  const [currentBili, setCurrentBili] = useState('');

  async function load() {
    try {
      const data = await getPatient(id);
      setPatient(data);
    } catch (e) {
      if (e.status === 401) onUnauthorized();
      else setError(e.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddLog(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await addLog(id, {
        ...logForm,
        weightGrams: logForm.weightGrams ? Number(logForm.weightGrams) : null,
        tdfMlKgDay: logForm.tdfMlKgDay ? Number(logForm.tdfMlKgDay) : null,
        feedingMl: logForm.feedingMl ? Number(logForm.feedingMl) : null,
      });
      setLogForm(emptyLog);
      load();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLog(logId) {
    try {
      await deleteLog(logId);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDischarge() {
    await updatePatient(id, { status: patient.status === 'active' ? 'discharged' : 'active' });
    load();
  }

  async function handleDelete() {
    if (!confirm('確定要刪除這位病人的所有資料嗎？此動作無法復原。')) return;
    await deletePatient(id);
    navigate('/patients');
  }

  if (error) return <div className="text-alert">{error}</div>;
  if (!patient) return <div className="text-sm text-ink/50">載入中…</div>;

  const days = ageInDays(patient.birthDate);
  const latestWeight = patient.logs?.[0]?.weightGrams || patient.birthWeightGrams;

  // auto-applied bilirubin lookup
  const groupIdx = gaGroupIndex(bilCalc.gaGroups, patient.gaWeeks);
  const dayIdx = nearestDayIndex(bilCalc.dayColumns, days);
  const photo = groupIdx >= 0 ? bilCalc.phototherapy[groupIdx][dayIdx] : null;
  const intensive = groupIdx >= 0 ? bilCalc.intensivePhototherapy[groupIdx][dayIdx] : null;
  const exchange = groupIdx >= 0 ? bilCalc.exchange[groupIdx][dayIdx] : null;
  const biliNum = parseFloat(currentBili);
  let zone = null;
  if (!Number.isNaN(biliNum) && photo != null) {
    if (biliNum >= exchange) zone = { label: '已達換血標準', cls: 'bg-alert/15 border-alert text-alert' };
    else if (biliNum >= intensive) zone = { label: '已達積極照光標準', cls: 'bg-alert/15 border-alert text-alert' };
    else if (biliNum >= photo) zone = { label: '已達照光標準', cls: 'bg-amber-700/15 border-amber-700 text-amber-900' };
    else zone = { label: '未達照光標準', cls: 'bg-stable/10 border-stable text-stable' };
  }

  return (
    <div>
      <Link to="/patients" className="text-sm text-ink/50 underline">
        ← 回病人列表
      </Link>

      <div className="flex items-center justify-between mt-2 mb-4">
        <h1 className="font-display text-2xl font-bold">{patient.identifier}</h1>
        <div className="flex gap-2">
          <button onClick={handleDischarge} className="text-xs border border-rule px-2 py-1 bg-white/50">
            {patient.status === 'active' ? '標記為已出院' : '標記為在院'}
          </button>
          <button onClick={handleDelete} className="text-xs border border-alert text-alert px-2 py-1 bg-alert/5">
            刪除
          </button>
        </div>
      </div>

      <div className="border border-rule bg-white/50 p-3 mb-4 text-sm grid sm:grid-cols-2 gap-x-6 gap-y-1">
        <div>GA：{formatGa(patient.gaWeeks, patient.gaDays)}</div>
        <div>出生日期：{formatDate(patient.birthDate)}</div>
        <div>出生體重：{patient.birthWeightGrams} g</div>
        <div className="readout">目前日齡：{days.toFixed(1)} day</div>
        <div className="readout">目前體重（最新記錄）：{latestWeight} g</div>
        <div>狀態：{patient.status === 'active' ? '在院' : '已出院'}</div>
        {patient.note && <div className="sm:col-span-2 text-ink/70">備註：{patient.note}</div>}
      </div>

      {/* auto-applied clinical calculators */}
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {groupIdx >= 0 && (
          <div className="border border-rule bg-white/50">
            <div className="px-3 py-2 bg-ink/[0.06] border-b border-rule font-medium text-sm">
              黃疸標準（依此病人 GA + 日齡自動查表）
            </div>
            <div className="p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink/70">照光標準</span>
                <span className="readout font-semibold">{photo} mg/dl</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/70">積極照光標準</span>
                <span className="readout font-semibold">{intensive} mg/dl</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/70">換血標準</span>
                <span className="readout font-semibold">{exchange} mg/dl</span>
              </div>
              <div className="pt-1.5">
                <label className="text-xs text-ink/60">目前 Bilirubin（選填）</label>
                <input
                  type="number"
                  value={currentBili}
                  onChange={(e) => setCurrentBili(e.target.value)}
                  placeholder="mg/dl"
                  className="readout w-full border border-rule px-2 py-1 mt-0.5"
                />
              </div>
              {zone && <div className={`border-l-4 px-3 py-1.5 text-sm font-medium ${zone.cls}`}>{zone.label}</div>}
            </div>
          </div>
        )}

        {tpnCalc && (
          <div className="border border-rule bg-white/50">
            <div className="px-3 py-2 bg-ink/[0.06] border-b border-rule font-medium text-sm">
              TPN 電解質每日劑量（依最新體重 {latestWeight}g 自動試算）
            </div>
            <div className="p-3 space-y-1">
              {Object.entries(tpnCalc.baseline).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-ink/70">{k}</span>
                  <span className="readout font-semibold">
                    {Math.round((latestWeight / 1000) * v * 100) / 100} {k === 'P' ? 'mmol' : 'mEq'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* daily log */}
      <h2 className="font-display text-lg font-semibold mb-2">每日紀錄</h2>
      <form onSubmit={handleAddLog} className="border border-rule bg-white/50 p-3 mb-4 grid sm:grid-cols-5 gap-2 items-end">
        <label className="text-xs flex flex-col gap-1">
          日期
          <input
            type="date"
            required
            value={logForm.logDate}
            onChange={(e) => setLogForm({ ...logForm, logDate: e.target.value })}
            className="border border-rule px-2 py-1 text-sm readout"
          />
        </label>
        <label className="text-xs flex flex-col gap-1">
          體重 (g)
          <input
            type="number"
            value={logForm.weightGrams}
            onChange={(e) => setLogForm({ ...logForm, weightGrams: e.target.value })}
            className="border border-rule px-2 py-1 text-sm readout"
          />
        </label>
        <label className="text-xs flex flex-col gap-1">
          TDF (ml/kg/day)
          <input
            type="number"
            value={logForm.tdfMlKgDay}
            onChange={(e) => setLogForm({ ...logForm, tdfMlKgDay: e.target.value })}
            className="border border-rule px-2 py-1 text-sm readout"
          />
        </label>
        <label className="text-xs flex flex-col gap-1">
          餵奶量 (ml)
          <input
            type="number"
            value={logForm.feedingMl}
            onChange={(e) => setLogForm({ ...logForm, feedingMl: e.target.value })}
            className="border border-rule px-2 py-1 text-sm readout"
          />
        </label>
        <button type="submit" disabled={saving} className="border border-ink bg-ink text-paper px-3 py-1.5 text-sm font-medium disabled:opacity-50">
          {saving ? '新增中…' : '+ 新增紀錄'}
        </button>
        <label className="text-xs flex flex-col gap-1 sm:col-span-5">
          備註
          <input
            value={logForm.note}
            onChange={(e) => setLogForm({ ...logForm, note: e.target.value })}
            className="border border-rule px-2 py-1 text-sm"
          />
        </label>
      </form>

      {error && <div className="text-sm text-alert mb-3">{error}</div>}

      <div className="border border-rule overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-ink/[0.06]">
              {['日期', '體重 (g)', 'TDF', '餵奶量 (ml)', '備註', ''].map((h) => (
                <th key={h} className="text-left font-medium px-3 py-2 border-b border-rule">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {patient.logs?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-3 text-ink/50">
                  尚無紀錄
                </td>
              </tr>
            )}
            {patient.logs?.map((log) => (
              <tr key={log.id}>
                <td className="px-3 py-2 border-b border-rule/70 readout">{formatDate(log.logDate)}</td>
                <td className="px-3 py-2 border-b border-rule/70 readout">{log.weightGrams ?? '—'}</td>
                <td className="px-3 py-2 border-b border-rule/70 readout">{log.tdfMlKgDay ?? '—'}</td>
                <td className="px-3 py-2 border-b border-rule/70 readout">{log.feedingMl ?? '—'}</td>
                <td className="px-3 py-2 border-b border-rule/70">{log.note}</td>
                <td className="px-3 py-2 border-b border-rule/70">
                  <button onClick={() => handleDeleteLog(log.id)} className="text-xs text-alert underline">
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
