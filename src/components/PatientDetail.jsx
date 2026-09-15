import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPatient, updatePatient, deletePatient, addVaccineEvent, deleteVaccineEvent } from '../api';
import { useAuth } from './AuthContext';
import { computeAge, formatDate, formatGa, dayCount } from '../utils/clinical';
import { groupConsecutiveByDate } from '../utils/timeline';
import jaundiceData from '../data/jaundice.json';
import tpnData from '../data/tpn.json';
import RemindersPanel from './RemindersPanel';
import RoundsForm from './RoundsForm';
import LinesSection from './LinesSection';

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

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { onUnauthorized } = useAuth();
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState('');
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

  async function handleDischarge() {
    await updatePatient(id, { status: patient.status === 'active' ? 'discharged' : 'active' });
    load();
  }

  async function handleDelete() {
    if (!confirm('確定要刪除這位病人的所有資料嗎？此動作無法復原。')) return;
    await deletePatient(id);
    navigate('/patients');
  }

  async function handleLogVaccine(vaccineType, doseNumber) {
    try {
      await addVaccineEvent(id, { vaccineType, eventDate: new Date().toISOString().slice(0, 10), doseNumber });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDeleteVaccine(eventId) {
    try {
      await deleteVaccineEvent(eventId);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <div className="text-alert">{error}</div>;
  if (!patient) return <div className="text-sm text-ink/50">載入中…</div>;

  const roundsAsc = [...patient.rounds].sort((a, b) => new Date(a.recordDate) - new Date(b.recordDate));
  const roundsDesc = [...roundsAsc].reverse();
  const mostRecentRound = roundsDesc[0] || null;
  const age = computeAge(patient.gaWeeks, patient.gaDays, patient.birthDate);
  const days = dayCount(patient.birthDate);
  const latestWeight = mostRecentRound?.weightGrams || patient.birthWeightGrams;

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

  const respRanges = groupConsecutiveByDate(roundsAsc, (r) => r.respMode).reverse();
  const tpnRanges = groupConsecutiveByDate(roundsAsc, (r) => (r.tpnActive ? 'TPN' : null)).reverse();

  return (
    <div>
      <Link to="/patients" className="text-sm text-ink/50 underline">
        ← 回病人列表
      </Link>

      <div className="flex items-center justify-between mt-2 mb-1">
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
      <p className="text-sm text-ink/60 mb-4">查房指引</p>

      <div className="border border-rule bg-white/50 p-3 mb-4 text-sm grid sm:grid-cols-2 gap-x-6 gap-y-1">
        <div>GA：{formatGa(patient.gaWeeks, patient.gaDays)}</div>
        <div>出生日期：{formatDate(patient.birthDate)}</div>
        <div>出生體重：{patient.birthWeightGrams} g</div>
        <div className="readout font-medium">{age.label}</div>
        {patient.edc && <div>EDC：{formatDate(patient.edc)}</div>}
        {patient.gpa && <div>GPA：{patient.gpa}</div>}
        {patient.deliveryMethod && <div>生產方式：{patient.deliveryMethod}</div>}
        {(patient.apgar1min != null || patient.apgar5min != null) && (
          <div>
            Apgar：{patient.apgar1min ?? '—'} / {patient.apgar5min ?? '—'}
          </div>
        )}
        <div className="readout">目前體重（最新記錄）：{latestWeight} g</div>
        <div>狀態：{patient.status === 'active' ? '在院' : '已出院'}</div>
        {patient.note && <div className="sm:col-span-2 text-ink/70">備註：{patient.note}</div>}
      </div>

      <h2 className="font-display text-lg font-semibold mb-2">提醒事項</h2>
      <div className="mb-6">
        <RemindersPanel patient={patient} rounds={patient.rounds} vaccineEvents={patient.vaccineEvents} onLogVaccine={handleLogVaccine} />
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

      <h2 className="font-display text-lg font-semibold mb-2">今日查房紀錄</h2>
      <div className="mb-6">
        <RoundsForm patientId={id} birthWeightGrams={patient.birthWeightGrams} mostRecentRound={mostRecentRound} onSaved={load} />
      </div>

      {(respRanges.length > 0 || tpnRanges.length > 0) && (
        <div className="mb-6 space-y-2 text-sm">
          {respRanges.length > 0 && (
            <div>
              <span className="font-medium">呼吸支持：</span>
              {respRanges.map((r, i) => (
                <span key={i} className="readout mr-2">
                  {r.key}({formatDate(r.start)}–{r.end === roundsDesc[0]?.recordDate ? '' : formatDate(r.end)})
                </span>
              ))}
            </div>
          )}
          {tpnRanges.length > 0 && (
            <div>
              <span className="font-medium">TPN：</span>
              {tpnRanges.map((r, i) => (
                <span key={i} className="readout mr-2">
                  ({formatDate(r.start)}–{formatDate(r.end)})
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div className="text-sm text-alert mb-3">{error}</div>}

      <h2 className="font-display text-lg font-semibold mb-2">查房紀錄歷史</h2>
      <div className="border border-rule overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-ink/[0.06]">
              {['日期', '體重(g)', '呼吸', 'Feeding', 'TDF醫囑', 'TPN', '診斷'].map((h) => (
                <th key={h} className="text-left font-medium px-3 py-2 border-b border-rule whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roundsDesc.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-3 text-ink/50">
                  尚無紀錄
                </td>
              </tr>
            )}
            {roundsDesc.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 border-b border-rule/70 readout whitespace-nowrap">{formatDate(r.recordDate)}</td>
                <td className="px-3 py-2 border-b border-rule/70 readout">{r.weightGrams ?? '—'}</td>
                <td className="px-3 py-2 border-b border-rule/70 readout whitespace-nowrap">
                  {r.respMode}
                  {r.respNote ? `(${r.respNote})` : ''}
                </td>
                <td className="px-3 py-2 border-b border-rule/70 whitespace-nowrap">
                  {r.feedingRoute} {r.feedingMode === 'alternating' ? `${r.feedingTypeA}/${r.feedingTypeB}` : r.feedingTypeA}{' '}
                  {r.feedingVolPerFeed}ml {r.feedingFrequency}
                </td>
                <td className="px-3 py-2 border-b border-rule/70 readout">{r.tdfOrdered ?? '—'}</td>
                <td className="px-3 py-2 border-b border-rule/70">{r.tpnActive ? '是' : '—'}</td>
                <td className="px-3 py-2 border-b border-rule/70">{r.diagnosis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-display text-lg font-semibold mb-2">管路</h2>
      <div className="mb-6">
        <LinesSection patientId={id} lines={patient.lines} onChanged={load} />
      </div>

      {patient.vaccineEvents.length > 0 && (
        <>
          <h2 className="font-display text-lg font-semibold mb-2">疫苗／單株抗體施打紀錄</h2>
          <div className="border border-rule bg-white/50 p-3 mb-6 space-y-1.5 text-sm">
            {patient.vaccineEvents.map((v) => (
              <div key={v.id} className="flex justify-between items-center border-b border-rule/60 pb-1.5 last:border-b-0">
                <span>
                  {v.vaccineType.toUpperCase()}
                  {v.doseNumber ? ` 第${v.doseNumber}劑` : ''} — <span className="readout">{formatDate(v.eventDate)}</span>
                </span>
                <button onClick={() => handleDeleteVaccine(v.id)} className="text-xs text-alert underline">
                  刪除
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
