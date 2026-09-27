export function ageInDays(birthDate, ref = new Date()) {
  const b = new Date(birthDate);
  const diffMs = ref.getTime() - b.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

// Whole day-of-life count where birth day itself = Day 0 (used by 查房指引).
export function dayCount(birthDate, ref = new Date()) {
  const b = new Date(birthDate);
  const startOfBirthDay = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  const startOfRefDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  return Math.round((startOfRefDay - startOfBirthDay) / 86400000);
}

export const BIRTH_GA_TERM_DAYS = 37 * 7; // 259 days = 37+0/7 weeks

export function birthGaTotalDays(gaWeeks, gaDays) {
  return gaWeeks * 7 + (gaDays || 0);
}

export function isTermAtBirth(gaWeeks, gaDays) {
  return birthGaTotalDays(gaWeeks, gaDays) >= BIRTH_GA_TERM_DAYS;
}

// Returns { dayCount, isTerm, pmaWeeks, pmaDays, pmaTotalDays, caDays, label }
// caDays counts from PMA 40+0/7 (PMA 40+0/7 = CA 0d, PMA 40+1/7 = CA 1d).
export function computeAge(gaWeeks, gaDays, birthDate, ref = new Date()) {
  const d = dayCount(birthDate, ref);
  const birthGaDays = birthGaTotalDays(gaWeeks, gaDays);
  const term = isTermAtBirth(gaWeeks, gaDays);
  if (term) {
    return { dayCount: d, isTerm: true, label: `${d} d/o` };
  }
  const pmaTotalDays = birthGaDays + d;
  const pmaWeeks = Math.floor(pmaTotalDays / 7);
  const pmaDays = pmaTotalDays % 7;
  if (pmaTotalDays < 280) {
    return {
      dayCount: d,
      isTerm: false,
      pmaWeeks,
      pmaDays,
      pmaTotalDays,
      label: `${d} d/o（PMA ${pmaWeeks}+${pmaDays}/7 週）`,
    };
  }
  const caDays = pmaTotalDays - 280;
  return {
    dayCount: d,
    isTerm: false,
    pmaTotalDays,
    caDays,
    label: `${d} d/o（CA ${caDays}d）`,
  };
}

export function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatGa(gaWeeks, gaDays) {
  return gaDays ? `${gaWeeks}+${gaDays}/7 週` : `${gaWeeks} 週`;
}

// Monday (00:00) of the week containing the given date.
export function mondayOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sun ... 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// e.g. "G2P1A0, GA 32+1, NSD, AS 3>7, BBW 2175gm"
export function birthHistoryDefault(patient) {
  const parts = [];
  if (patient.gpa) parts.push(patient.gpa);
  parts.push(`GA ${patient.gaWeeks}+${patient.gaDays ?? 0}`);
  if (patient.deliveryMethod) parts.push(patient.deliveryMethod);
  if (patient.apgar1min != null && patient.apgar5min != null) {
    parts.push(`AS ${patient.apgar1min}>${patient.apgar5min}`);
  }
  parts.push(`BBW ${patient.birthWeightGrams}gm`);
  return parts.join(', ');
}
