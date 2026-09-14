export function ageInDays(birthDate, ref = new Date()) {
  const b = new Date(birthDate);
  const diffMs = ref.getTime() - b.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

export function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatGa(gaWeeks, gaDays) {
  return gaDays ? `${gaWeeks}+${gaDays}/7 週` : `${gaWeeks} 週`;
}
