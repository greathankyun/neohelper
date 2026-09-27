import { useState } from 'react';
import { Link } from 'react-router-dom';
import { updatePatient } from '../api';
import { computeAge, formatGa, formatDate, birthHistoryDefault } from '../utils/clinical';
import { groupConsecutiveByDate } from '../utils/timeline';
import { feedingDisplay } from '../utils/reminders';

const FREE_TEXT_FIELDS = [
  { key: 'dataSummary', label: 'Data' },
  { key: 'managementSummary', label: 'Management' },
  { key: 'coursePlanSummary', label: 'Course + Plan' },
];

function MultiLine({ text, placeholder }) {
  if (!text) return <div className="text-sm text-ink/30">{placeholder}</div>;
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => (
        <div key={i} className="text-sm">
          {line}
        </div>
      ))}
    </div>
  );
}

function StatusSnapshot({ patient, rounds, showIdentifier }) {
  const age = computeAge(patient.gaWeeks, patient.gaDays, patient.birthDate);
  const roundsAsc = [...rounds].sort((a, b) => new Date(a.recordDate) - new Date(b.recordDate));
  const latest = roundsAsc[roundsAsc.length - 1] || null;
  const respRanges = groupConsecutiveByDate(roundsAsc, (r) => r.respMode);
  const tpnRanges = groupConsecutiveByDate(roundsAsc, (r) => (r.tpnActive ? 'TPN' : null));
  const latestDateStr = latest?.recordDate;

  const currentWeight = latest?.weightGrams ?? null;
  const hasRegained = currentWeight != null && currentWeight > patient.birthWeightGrams;
  let weightLine;
  if (currentWeight == null) {
    weightLine = `${patient.birthWeightGrams}gm`;
  } else if (hasRegained) {
    weightLine = `${currentWeight}gm`;
  } else {
    weightLine = `${currentWeight}gm(BBW ${patient.birthWeightGrams}gm)`;
  }

  return (
    <div className="text-sm leading-relaxed space-y-1">
      {showIdentifier && <div className="font-display font-semibold">{patient.identifier}</div>}
      <div className="readout text-xs text-ink/60">
        {formatGa(patient.gaWeeks, patient.gaDays)}／出生 {formatDate(patient.birthDate)}／{age.label}
      </div>
      <div className="readout text-xs">{weightLine}</div>
      {respRanges.length > 0 && (
        <div className="readout text-xs">
          {respRanges.map((r, i) => (
            <span key={i} className={i > 0 ? 'ml-1.5' : ''}>
              {r.key}({formatDate(r.start)}–{r.end === latestDateStr ? '' : formatDate(r.end)})
            </span>
          ))}
        </div>
      )}
      {latest && feedingDisplay(latest) && <div className="text-xs">{feedingDisplay(latest)}</div>}
      {tpnRanges.length > 0 && (
        <div className="readout text-xs text-ink/60">
          TPN {tpnRanges.map((r, i) => (
            <span key={i} className="ml-1">
              ({formatDate(r.start)}–{r.end === latestDateStr ? '' : formatDate(r.end)})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HandoffCard({ patient, rounds, onChanged, linkToDetail = true }) {
  const [editing, setEditing] = useState(false);
  const defaultBirthHistory = birthHistoryDefault(patient);
  const [form, setForm] = useState({
    birthHistoryNote: patient.birthHistoryNote || defaultBirthHistory,
    diagnosis: patient.diagnosis || '',
    dataSummary: patient.dataSummary || '',
    managementSummary: patient.managementSummary || '',
    coursePlanSummary: patient.coursePlanSummary || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function openEdit() {
    setForm({
      birthHistoryNote: patient.birthHistoryNote || defaultBirthHistory,
      diagnosis: patient.diagnosis || '',
      dataSummary: patient.dataSummary || '',
      managementSummary: patient.managementSummary || '',
      coursePlanSummary: patient.coursePlanSummary || '',
    });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await updatePatient(patient.id, form);
      setEditing(false);
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const displayedBirthHistory = patient.birthHistoryNote || defaultBirthHistory;

  return (
    <div className="border border-rule bg-white/50 p-3">
      <div className="grid sm:grid-cols-[minmax(11rem,14rem)_1fr] gap-3">
        <div className="sm:border-r sm:border-rule sm:pr-3">
          <StatusSnapshot patient={patient} rounds={rounds} showIdentifier={linkToDetail} />
          {linkToDetail && (
            <Link to={`/patients/${patient.id}`} className="text-xs text-alert underline mt-1.5 inline-block">
              查房指引 →
            </Link>
          )}
        </div>

        <div>
          {!editing ? (
            <div className="space-y-2.5">
              <div>
                <div className="text-xs font-mono uppercase tracking-wide text-ink/50">Diagnosis</div>
                <div className="text-sm mb-1">
                  <span className="text-ink/50">Birth history：</span>
                  {displayedBirthHistory}
                </div>
                <MultiLine text={patient.diagnosis} placeholder="（尚未填寫）" />
              </div>
              {FREE_TEXT_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <div className="text-xs font-mono uppercase tracking-wide text-ink/50">{label}</div>
                  <MultiLine text={patient[key]} placeholder="（尚未填寫）" />
                </div>
              ))}
              <button onClick={openEdit} className="text-xs border border-rule px-2 py-1 bg-white/70">
                編輯交班摘要
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <div className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">Diagnosis</div>
                <label className="text-xs flex flex-col gap-1 mb-1.5">
                  Birth history（已依出生資料自動帶入，可直接修改）
                  <input
                    value={form.birthHistoryNote}
                    onChange={(e) => setForm({ ...form, birthHistoryNote: e.target.value })}
                    className="border border-rule px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-xs flex flex-col gap-1">
                  Diagnosis（每行一項，Enter 換行）
                  <textarea
                    value={form.diagnosis}
                    onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                    className="border border-rule px-2 py-1 text-sm min-h-[3.5rem]"
                  />
                </label>
              </div>
              {FREE_TEXT_FIELDS.map(({ key, label }) => (
                <label key={key} className="text-xs flex flex-col gap-1">
                  {label}（每行一項，Enter 換行）
                  <textarea
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="border border-rule px-2 py-1 text-sm min-h-[3.5rem]"
                  />
                </label>
              ))}
              {error && <div className="text-xs text-alert">{error}</div>}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs border border-ink bg-ink text-paper px-3 py-1 disabled:opacity-50"
                >
                  {saving ? '儲存中…' : '儲存'}
                </button>
                <button onClick={() => setEditing(false)} className="text-xs border border-rule px-3 py-1 bg-white/70">
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
