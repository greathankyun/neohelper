import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { updatePatient } from '../api';
import { computeAge, formatDate, birthHistoryDefault } from '../utils/clinical';
import { groupConsecutiveByDate } from '../utils/timeline';
import { feedingDisplay } from '../utils/reminders';

const COLUMNS = [
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'dataSummary', label: 'Data' },
  { key: 'managementSummary', label: 'Management' },
  { key: 'coursePlanSummary', label: 'Course + Plan' },
];

// ~~text~~ renders as light gray — the user's own manual markup for flagging
// expired/discontinued items (a med, a line, a vent mode) without deleting the entry.
function renderGrayMarkup(line) {
  const parts = line.split(/(~~.+?~~)/g);
  return parts.map((part, i) => {
    const m = part.match(/^~~(.+)~~$/);
    if (m) {
      return (
        <span key={i} className="text-ink/30">
          {m[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function MultiLine({ text, placeholder }) {
  if (!text) return <div className="text-sm text-ink/30">{placeholder}</div>;
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  return (
    <div className="space-y-0.5 overflow-x-auto">
      {lines.map((line, i) => (
        <div key={i} className="text-sm whitespace-nowrap">
          {renderGrayMarkup(line)}
        </div>
      ))}
    </div>
  );
}

function ColumnHeader({ children }) {
  return <div className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">{children}</div>;
}

// Textarea with a "灰化選取文字" button: select some text, click it, and that
// substring gets wrapped in ~~ ~~ so it renders gray without being deleted.
function GrayableTextarea({ value, onChange }) {
  const ref = useRef(null);

  function grayOutSelection() {
    const el = ref.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    if (selectionStart === selectionEnd) return;
    const before = value.slice(0, selectionStart);
    const selected = value.slice(selectionStart, selectionEnd);
    const after = value.slice(selectionEnd);
    onChange(`${before}~~${selected}~~${after}`);
  }

  return (
    <div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-rule px-2 py-1 text-sm min-h-[5rem] w-full"
      />
      <button
        type="button"
        onClick={grayOutSelection}
        className="text-xs border border-rule px-1.5 py-0.5 mt-1 bg-white/70 text-ink/60"
        title="先反白要標記的文字，再按這個按鈕"
      >
        反白文字→變灰（已到期/停用）
      </button>
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
      <div className="readout text-xs text-ink/60">{age.label}</div>
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
              <MultiLine text={patient.diagnosis} placeholder="（尚未填寫）" />
              <div className="text-sm mt-1.5">
                <span className="text-ink/50">Birth history：</span>
                {displayedBirthHistory}
              </div>
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
              <GrayableTextarea value={form.diagnosis} onChange={(v) => setForm({ ...form, diagnosis: v })} />
              <label className="text-xs flex flex-col gap-1 mt-1.5">
                Birth history（已依出生資料自動帶入，可直接修改）
                <input
                  value={form.birthHistoryNote}
                  onChange={(e) => setForm({ ...form, birthHistoryNote: e.target.value })}
                  className="border border-rule px-2 py-1 text-sm"
                />
              </label>
            </div>
            {COLUMNS.slice(1).map(({ key, label }) => (
              <div key={key}>
                <ColumnHeader>{label}</ColumnHeader>
                <GrayableTextarea value={form[key]} onChange={(v) => setForm({ ...form, [key]: v })} />
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
          <div className="flex gap-2 items-center flex-wrap">
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
            <span className="text-xs text-ink/50">每行一項，Enter 換行；不會自動換行</span>
            {error && <span className="text-xs text-alert">{error}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
