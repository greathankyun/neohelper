import screening from './screening.json';
import rop from './rop.json';
import jaundice from './jaundice.json';
import infection from './infection.json';
import omphalitis from './omphalitis.json';
import hypoglycemia from './hypoglycemia.json';
import exchangeTransfusion from './exchangeTransfusion.json';
import bpd from './bpd.json';
import hypertension from './hypertension.json';
import nutrition from './nutrition.json';
import tpn from './tpn.json';
import drugDosing from './drugDosing.json';
import roundsChecklist from './roundsChecklist.json';
import hieCooling from './hieCooling.json';
import pearls from './pearls.json';

// module-level fields that should render as callouts above the section list
const MODULE_NOTE_KEYS = [
  'missingDataWarning',
  'externalRef',
  'note',
  'reference',
  'references',
];

function normalize(raw) {
  let sections = raw.sections;

  if (!sections && raw.tables) {
    // nutrition-style: top-level "tables" array
    sections = raw.tables.map((t) => ({
      id: t.id,
      title: t.title,
      table: { columns: t.columns, rows: t.rows },
    }));
  }

  if (!sections && raw.drugs) {
    // drugDosing-style: top-level "drugs" array
    sections = raw.drugs.map((d) => ({ ...d, title: d.name }));
  }

  if (!sections && raw.bpTable) {
    // hypertension-style
    sections = [
      { id: 'bp-table', title: '血壓百分位表', table: raw.bpTable },
      {
        id: 'workup',
        title: raw.workup?.title,
        twoColumnList: [
          { heading: '常規檢查', items: raw.workup?.generallyUseful },
          { heading: '選擇性檢查', items: raw.workup?.usefulInSelected },
        ],
      },
    ];
  }

  if (!sections && raw.items && !raw.sections) {
    // pearls-style: flat items array
    sections = [{ id: 'items', title: null, items: raw.items }];
  }

  const moduleNotes = MODULE_NOTE_KEYS.filter((k) => raw[k]).map((k) => ({
    key: k,
    value: raw[k],
  }));

  return {
    id: raw.id,
    title: raw.title,
    subtitle: raw.subtitle,
    color: raw.color,
    sourceRef: raw.sourceRef,
    moduleNotes,
    sections: sections || [],
  };
}

export const MODULES = [
  screening,
  rop,
  jaundice,
  infection,
  omphalitis,
  hypoglycemia,
  exchangeTransfusion,
  bpd,
  hypertension,
  nutrition,
  tpn,
  drugDosing,
  hieCooling,
  roundsChecklist,
  pearls,
].map(normalize);

export function getModule(id) {
  return MODULES.find((m) => m.id === id);
}

// Flatten searchable text per module for the search bar.
function flattenToText(value, acc) {
  if (value == null) return;
  if (typeof value === 'string' || typeof value === 'number') {
    acc.push(String(value));
  } else if (Array.isArray(value)) {
    value.forEach((v) => flattenToText(v, acc));
  } else if (typeof value === 'object') {
    Object.values(value).forEach((v) => flattenToText(v, acc));
  }
}

export const SEARCH_INDEX = MODULES.map((m) => {
  const acc = [];
  flattenToText(m, acc);
  return { id: m.id, title: m.title, subtitle: m.subtitle, text: acc.join(' \u2022 ') };
});
