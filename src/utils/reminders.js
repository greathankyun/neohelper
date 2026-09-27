import { birthGaTotalDays, isTermAtBirth, dayCount, mondayOfWeek, addDays, formatDate } from './clinical';
import screeningData from '../data/screening.json';

const FEEDS_PER_DAY = { Q3H: 8, Q4H: 6 };

// ---- oTDF (from a rounds record's feeding fields) ----
export function computeOtdf(round, birthWeightGrams) {
  if (!round?.feedingVolPerFeed || !round?.feedingFrequency) return null;
  const feeds = FEEDS_PER_DAY[round.feedingFrequency];
  if (!feeds) return null;
  const totalMl = round.feedingVolPerFeed * feeds;
  const weightForCalcG = round.weightGrams && round.weightGrams > birthWeightGrams ? round.weightGrams : birthWeightGrams;
  return totalMl / (weightForCalcG / 1000);
}

export function feedingDisplay(round) {
  if (!round?.feedingRoute) return null;
  const type =
    round.feedingMode === 'alternating' && round.feedingTypeA && round.feedingTypeB
      ? `${round.feedingTypeA}/${round.feedingTypeB}` +
        (round.feedingSplitA && round.feedingSplitB ? `（${round.feedingTypeA} ${round.feedingSplitA}餐/${round.feedingTypeB} ${round.feedingSplitB}餐）` : '')
      : round.feedingTypeA;
  return `${round.feedingRoute} ${type || ''} ${round.feedingVolPerFeed ?? ''}ml ${round.feedingFrequency || ''}`.trim();
}

// ---- weight warning + growth target ----
export function weightStatus(patient, rounds) {
  const birthWeight = patient.birthWeightGrams;
  const today = dayCount(patient.birthDate);
  const weighed = rounds.filter((r) => r.weightGrams != null).sort((a, b) => new Date(a.recordDate) - new Date(b.recordDate));
  const latest = weighed[weighed.length - 1];
  const currentWeight = latest ? latest.weightGrams : birthWeight;
  const minWeight = Math.min(birthWeight, ...weighed.map((r) => r.weightGrams));
  const dropPct = ((birthWeight - minWeight) / birthWeight) * 100;

  const warnings = [];
  if (dropPct > 10) {
    warnings.push(`體重較出生體重下降 ${dropPct.toFixed(1)}%（超過10%）`);
  }
  if (today >= 10 && currentWeight < birthWeight) {
    warnings.push(`已滿10天大，體重仍未回到出生體重（目前 ${currentWeight}g／出生 ${birthWeight}g）`);
  }

  let growthTarget = null;
  if (currentWeight >= birthWeight) {
    growthTarget =
      birthWeight < 2000 && currentWeight < 2000
        ? '10–20 g/kg/day'
        : '20–30 g/day';
  }

  return { currentWeight, minWeight, dropPct, warnings, growthTarget };
}

// ---- HBV ----
export function hbvStatus(patient, rounds, vaccineEvents) {
  const today = dayCount(patient.birthDate);
  const weighed = rounds.filter((r) => r.weightGrams != null);
  const currentWeight = weighed.length ? weighed[weighed.length - 1].weightGrams : patient.birthWeightGrams;
  const hbv1 = vaccineEvents.find((v) => v.vaccineType === 'hbv1');
  const hbv2 = vaccineEvents.find((v) => v.vaccineType === 'hbv2');

  const hbv1Due = !hbv1 && (currentWeight >= 2000 || today >= 30);
  const hbv1LatestByAgeDate = addDays(new Date(patient.birthDate), 30);
  let hbv2Due = false;
  let hbv2EarliestDate = null;
  if (hbv1 && !hbv2) {
    hbv2EarliestDate = addDays(new Date(hbv1.eventDate), 31);
    hbv2Due = new Date() >= hbv2EarliestDate;
  }

  return { hbv1Given: hbv1 || null, hbv2Given: hbv2 || null, hbv1Due, hbv1LatestByAgeDate, hbv2Due, hbv2EarliestDate };
}

// ---- Vit D / Fe / 滿月血 / BPD survey (oTDF or PMA based) ----
export function nutritionMilestones(patient, rounds) {
  const preterm = !isTermAtBirth(patient.gaWeeks, patient.gaDays);
  const sorted = [...rounds].sort((a, b) => new Date(b.recordDate) - new Date(a.recordDate));
  const latestOtdf = sorted.length ? computeOtdf(sorted[0], patient.birthWeightGrams) : null;
  const birthGaDays = birthGaTotalDays(patient.gaWeeks, patient.gaDays);
  const today = dayCount(patient.birthDate);
  const pmaTotalDays = birthGaDays + today;

  return {
    latestOtdf,
    vitDDue: latestOtdf != null && latestOtdf >= 50,
    feDue: preterm && latestOtdf != null && latestOtdf >= 100,
    feNote: '80–120 都是可以開始添加的時間',
    fullMonthBloodDue: preterm && latestOtdf != null && latestOtdf >= 120,
    bpdSurveyDue: preterm && birthGaDays <= 31 * 7 + 6 && pmaTotalDays >= 36 * 7,
    bpdSurveyApplicable: preterm && birthGaDays <= 31 * 7 + 6,
    bpdSurveyTargetDate: preterm && birthGaDays <= 31 * 7 + 6 ? addDays(new Date(patient.birthDate), Math.max(0, 36 * 7 - birthGaDays)) : null,
  };
}

// ---- Brain echo (reuses screening.json schedule) ----
export function brainEchoStatus(patient) {
  const bw = patient.birthWeightGrams;
  const birthGaDays = birthGaTotalDays(patient.gaWeeks, patient.gaDays);
  const eligible = bw <= 2000 || birthGaDays < 36 * 7;
  if (!eligible) return { eligible: false, milestones: [] };

  let dueDays;
  if (bw <= 999) dueDays = [1, 3, 7, 21];
  else if (bw <= 1499) dueDays = [3, 7, 21];
  else dueDays = [7, 21];

  const today = dayCount(patient.birthDate);
  const milestones = dueDays.map((d) => ({
    day: d,
    date: addDays(new Date(patient.birthDate), d),
    status: today < d ? 'upcoming' : today === d ? 'due-today' : 'past',
  }));
  return { eligible: true, milestones, sourceRef: screeningData.sections.find((s) => s.id === 'brain-echo')?.title };
}

// ---- ROP referral (first-referral judgment; ongoing Zone/Stage follow-up uses the ROP module) ----
export function ropReferralStatus(patient) {
  const bw = patient.birthWeightGrams;
  const birthGaDays = birthGaTotalDays(patient.gaWeeks, patient.gaDays);
  const hasRiskFactor = patient.ropRiskPressor || patient.ropRiskO2ThreeDays || patient.ropRiskO2Unmonitored;

  const eligible =
    birthGaDays <= 30 * 7 + 6 ||
    bw <= 1500 ||
    (birthGaDays >= 31 * 7 && birthGaDays <= 34 * 7 + 6 && bw >= 1501 && bw <= 2000 && hasRiskFactor);

  if (!eligible) return { eligible: false };

  let targetDay;
  let rule;
  if (birthGaDays >= 27 * 7) {
    targetDay = 28;
    rule = '出生滿4週之當週週一';
  } else if (birthGaDays >= 25 * 7) {
    targetDay = 31 * 7 - birthGaDays;
    rule = 'PMA滿31週之當週週一';
  } else {
    targetDay = 42;
    rule = '出生滿6週之當週週一（因出生週數較小，可不滿PMA31週即照會）';
  }

  const targetDate = addDays(new Date(patient.birthDate), targetDay);
  const referralMonday = mondayOfWeek(targetDate);
  const today = dayCount(patient.birthDate);

  return {
    eligible: true,
    rule,
    targetDay,
    referralMonday,
    referralMondayLabel: formatDate(referralMonday),
    isDue: today >= targetDay,
  };
}

// ---- Synagis ----
export function synagisStatus(patient, vaccineEvents) {
  const birthGaDays = birthGaTotalDays(patient.gaWeeks, patient.gaDays);
  const categories = [];
  if (birthGaDays < 33 * 7) categories.push({ label: 'GA < 33週早產兒', maxDoses: 6 });
  else if (birthGaDays <= 35 * 7 + 6) categories.push({ label: 'GA 33–35+6週早產兒', maxDoses: 3 });
  if (patient.synagisCld) categories.push({ label: 'CLD/BPD（GA<35週）', maxDoses: null });
  if (patient.synagisCardiac) categories.push({ label: '先天性心臟病（醫師判斷符合適應症）', maxDoses: 6 });

  if (!categories.length) return { eligible: false };

  // If any applicable pathway defines a numeric dose cap, that cap governs (a
  // concrete GA-based or cardiac cap is not waived just because the infant also
  // happens to qualify via the uncapped CLD/BPD pathway). Only show "no limit"
  // when every applicable pathway is itself uncapped.
  const numericCaps = categories.map((c) => c.maxDoses).filter((m) => m != null);
  const maxDoses = numericCaps.length ? Math.max(...numericCaps) : null;
  const doses = vaccineEvents
    .filter((v) => v.vaccineType === 'synagis')
    .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

  const dosesGiven = doses.length;
  const lastDose = doses[doses.length - 1];
  const nextDueDate = lastDose ? addDays(new Date(lastDose.eventDate), 30) : null;
  const atMax = maxDoses != null && dosesGiven >= maxDoses;

  return {
    eligible: true,
    categories,
    maxDoses,
    dosesGiven,
    lastDoseDate: lastDose?.eventDate || null,
    nextDueDate,
    nextDueDateLabel: nextDueDate ? formatDate(nextDueDate) : null,
    atMax,
  };
}

// ---- aggregate everything into one panel-ready structure ----
export function computeReminders(patient, rounds, vaccineEvents) {
  return {
    weight: weightStatus(patient, rounds),
    hbv: hbvStatus(patient, rounds, vaccineEvents),
    nutrition: nutritionMilestones(patient, rounds),
    brainEcho: brainEchoStatus(patient),
    rop: ropReferralStatus(patient),
    synagis: synagisStatus(patient, vaccineEvents),
  };
}
