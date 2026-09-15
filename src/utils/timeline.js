// Groups an ascending-by-date array of rounds records into contiguous same-value
// ranges, breaking the group whenever the date isn't the very next calendar day
// (so a missed/blank day always starts a fresh range rather than silently bridging).
export function groupConsecutiveByDate(roundsAsc, keyFn) {
  const groups = [];
  let prevDateStr = null;
  for (const r of roundsAsc) {
    const key = keyFn(r);
    const dateStr = r.recordDate;
    if (!key) {
      prevDateStr = dateStr;
      continue;
    }
    const last = groups[groups.length - 1];
    const isNextDay = prevDateStr && (new Date(dateStr) - new Date(prevDateStr)) / 86400000 === 1;
    if (last && last.key === key && isNextDay) {
      last.end = dateStr;
    } else {
      groups.push({ key, start: dateStr, end: dateStr });
    }
    prevDateStr = dateStr;
  }
  return groups;
}
