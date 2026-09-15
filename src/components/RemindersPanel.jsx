import { computeReminders } from '../utils/reminders';
import { formatDate } from '../utils/clinical';

function Card({ tone = 'neutral', title, children }) {
  const toneCls = {
    alert: 'border-alert bg-alert/10',
    warn: 'border-amber-700 bg-amber-700/10',
    ok: 'border-stable bg-stable/10',
    neutral: 'border-rule bg-white/50',
  };
  return (
    <div className={`border-l-4 border ${toneCls[tone]} px-3 py-2`}>
      <div className="text-sm font-medium mb-0.5">{title}</div>
      <div className="text-sm text-ink/80 leading-relaxed">{children}</div>
    </div>
  );
}

export default function RemindersPanel({ patient, rounds, vaccineEvents, onLogVaccine }) {
  const r = computeReminders(patient, rounds, vaccineEvents);

  return (
    <div className="space-y-2">
      {r.weight.warnings.map((w, i) => (
        <Card key={i} tone="alert" title="體重警示">
          {w}
        </Card>
      ))}
      {r.weight.growthTarget && (
        <Card tone="neutral" title="每日成長目標">
          {r.weight.growthTarget}（目前體重 {r.weight.currentWeight}g）
        </Card>
      )}

      <Card tone={r.hbv.hbv1Given ? 'ok' : r.hbv.hbv1Due ? 'alert' : 'neutral'} title="HBV 疫苗 第1劑">
        {r.hbv.hbv1Given ? (
          <>已施打（{formatDate(r.hbv.hbv1Given.eventDate)}）</>
        ) : r.hbv.hbv1Due ? (
          <div className="flex items-center justify-between gap-2">
            <span>已符合條件（滿2000g或滿1個月大），可施打</span>
            <button
              onClick={() => onLogVaccine('hbv1')}
              className="text-xs border border-alert text-alert px-2 py-0.5 shrink-0"
            >
              記錄今天已打
            </button>
          </div>
        ) : (
          '尚未符合條件'
        )}
      </Card>

      {r.hbv.hbv1Given && (
        <Card tone={r.hbv.hbv2Given ? 'ok' : r.hbv.hbv2Due ? 'alert' : 'neutral'} title="HBV 疫苗 第2劑">
          {r.hbv.hbv2Given ? (
            <>已施打（{formatDate(r.hbv.hbv2Given.eventDate)}）</>
          ) : r.hbv.hbv2Due ? (
            <div className="flex items-center justify-between gap-2">
              <span>與第1劑已間隔 ≥31 天，可施打</span>
              <button
                onClick={() => onLogVaccine('hbv2')}
                className="text-xs border border-alert text-alert px-2 py-0.5 shrink-0"
              >
                記錄今天已打
              </button>
            </div>
          ) : (
            <>最早可施打日期：{formatDate(r.hbv.hbv2EarliestDate)}</>
          )}
        </Card>
      )}

      {r.nutrition.vitDDue && (
        <Card tone="warn" title="Vit.D 添加">
          oTDF 已達 {r.nutrition.latestOtdf.toFixed(0)}（≥50），可添加
        </Card>
      )}
      {r.nutrition.feDue && (
        <Card tone="warn" title="Fe 添加（早產兒）">
          oTDF 已達 {r.nutrition.latestOtdf.toFixed(0)}（≥100），可添加。備註：{r.nutrition.feNote}
        </Card>
      )}
      {r.nutrition.fullMonthBloodDue && (
        <Card tone="warn" title="滿月血（早產兒常規抽血）">
          oTDF 已達 {r.nutrition.latestOtdf.toFixed(0)}（≥120），提醒抽血
        </Card>
      )}
      {r.nutrition.bpdSurveyDue && (
        <Card tone="warn" title="BPD survey">
          已達 PMA 36+0 週，提醒進行 BPD survey
        </Card>
      )}

      {r.brainEcho.eligible && (
        <Card tone="neutral" title="腦部超音波追蹤時程">
          <div className="flex flex-wrap gap-2">
            {r.brainEcho.milestones.map((m) => (
              <span
                key={m.day}
                className={`text-xs border px-2 py-0.5 ${
                  m.status === 'due-today'
                    ? 'border-alert text-alert bg-alert/10'
                    : m.status === 'past'
                    ? 'border-rule text-ink/40'
                    : 'border-rule text-ink/70'
                }`}
              >
                Day {m.day}
                {m.status === 'due-today' && '（今天）'}
              </span>
            ))}
          </div>
        </Card>
      )}

      {r.rop.eligible && (
        <Card tone={r.rop.isDue ? 'alert' : 'neutral'} title="ROP 視網膜病變篩檢轉介">
          符合轉介條件。依規則「{r.rop.rule}」，應於 <span className="readout font-medium">{r.rop.referralMondayLabel}</span>{' '}
          週一 08–17 時發照會。
          {r.rop.isDue && '（已達或超過轉介時間，請確認是否已發照會）'}
        </Card>
      )}

      {r.synagis.eligible && (
        <Card tone={r.synagis.atMax ? 'ok' : 'warn'} title="Synagis / Palivizumab">
          <div className="space-y-1">
            <div>符合條件：{r.synagis.categories.map((c) => c.label).join('、')}</div>
            <div>
              已施打 {r.synagis.dosesGiven} 劑{r.synagis.maxDoses != null ? `（最多 ${r.synagis.maxDoses} 劑）` : '（無次數上限，依醫師判斷）'}
            </div>
            {r.synagis.nextDueDateLabel && !r.synagis.atMax && <div>下一劑約於：{r.synagis.nextDueDateLabel}</div>}
            {!r.synagis.atMax && (
              <button
                onClick={() => onLogVaccine('synagis', r.synagis.dosesGiven + 1)}
                className="text-xs border border-alert text-alert px-2 py-0.5"
              >
                記錄今天已打第 {r.synagis.dosesGiven + 1} 劑
              </button>
            )}
            <div className="text-xs text-ink/50">出院前務必確認是否需要繼續施打</div>
          </div>
        </Card>
      )}
    </div>
  );
}
