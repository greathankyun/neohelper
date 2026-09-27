import { useState } from 'react';
import { Link } from 'react-router-dom';
import { updatePatient } from '../api';
import { computeAge, formatGa, formatDate, birthHistoryDefault } from '../utils/clinical';
import { groupConsecutiveByDate } from '../utils/timeline';
import { feedingDisplay } from '../utils/reminders';

const COLUMNS = [
  { key: 'diagnosis', label: 'Diagnosis' },
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

function ColumnHeader({ children }) {
  return <div className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">{children}</div>;
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
  const blankForm = () => ({
    birthHistoryNote: patient.birthHistoryNote || defaultBirthHistory,
    diagnosis: patient.diagnosis || '',
    dataSummary: patient.dataSummary || '',
    managementSummary: patient.managementSummary || '',
    coursePlanSummary: patient.coursePlanSummary || '',
  });
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function openEdit() {
    setForm(blankForm());
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
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(10rem,13rem)_repeat(4,minmax(9rem,1fr))] gap-3">
        {/* Status column */}
        <div className="sm:border-r sm:border-rule sm:pr-3">
          <StatusSnapshot patient={patient} rounds={rounds} showIdentifier={linkToDetail} />
          {linkToDetail && (
            <Link to={`/patients/${patient.id}`} className="text-xs text-alert underline mt-1.5 inline-block">
              查房指引 →
            </Link>
          )}
        </div>

        {!editing ? (
          <>
            <div className="sm:border-r sm:border-rule sm:pr-3">
              <ColumnHeader>Diagnosis</ColumnHeader>
              <div className="text-sm mb-1">
                <span className="text-ink/50">Birth history：</span>
                {displayedBirthHistory}
              </div>
              <MultiLine text={patient.diagnosis} placeholder="（尚未填寫）" />
            </div>
            {COLUMNS.slice(1).map(({ key, label }, i) => (
              <div key={key} className={i < COLUMNS.length - 2 ? 'sm:border-r sm:border-rule sm:pr-3' : ''}>
                <ColumnHeader>{label}</ColumnHeader>
                <MultiLine text={patient[key]} placeholder="（尚未填寫）" />
              </div>
            ))}
          </>
        ) : (
          <div className="sm:col-span-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <ColumnHeader>Diagnosis</ColumnHeader>
              <label className="text-xs flex flex-col gap-1 mb-1.5">
                Birth history（已依出生資料自動帶入，可直接修改）
                <input
                  value={form.birthHistoryNote}
                  onChange={(e) => setForm({ ...form, birthHistoryNote: e.target.value })}
                  className="border border-rule px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs flex flex-col gap-1">
                每行一項，Enter 換行
                <textarea
                  value={form.diagnosis}
                  onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                  className="border border-rule px-2 py-1 text-sm min-h-[5rem]"
                />
              </label>
            </div>
            {COLUMNS.slice(1).map(({ key, label }) => (
              <div key={key}>
                <ColumnHeader>{label}</ColumnHeader>
                <label className="text-xs flex flex-col gap-1">
                  每行一項，Enter 換行
                  <textarea
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="border border-rule px-2 py-1 text-sm min-h-[5rem]"
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3">
        {!editing ? (
          <button onClick={openEdit} className="text-xs border border-rule px-2 py-1 bg-white/70">
            編輯交班摘要
          </button>
        ) : (
          <div className="flex gap-2 items-center">
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
            {error && <span className="text-xs text-alert">{error}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
