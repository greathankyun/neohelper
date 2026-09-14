import { useParams, Link } from 'react-router-dom';
import { getModule } from '../data';
import { colorOf } from '../theme';
import { Callout } from './blocks';
import SectionBlock from './SectionBlock';

const NOTE_LABELS = {
  missingDataWarning: '資料缺漏提醒',
  externalRef: '延伸查詢',
  note: '備註',
  reference: '參考文獻',
  references: '參考文獻',
};

export default function ModulePage() {
  const { id } = useParams();
  const mod = getModule(id);

  if (!mod) {
    return (
      <div>
        <p>找不到這個主題。</p>
        <Link to="/" className="underline">
          回首頁
        </Link>
      </div>
    );
  }

  const c = colorOf(mod.color);

  return (
    <div>
      <div className={`border-l-4 ${c.edge} pl-4 mb-5`}>
        <h1 className="font-display text-2xl font-bold">{mod.title}</h1>
        {mod.subtitle && <p className="text-ink/70 mt-1">{mod.subtitle}</p>}
        {mod.sourceRef && <p className="font-mono text-xs text-ink/40 mt-1.5">{mod.sourceRef}</p>}
      </div>

      {mod.moduleNotes.map(({ key, value }) => (
        <Callout key={key} label={NOTE_LABELS[key] || key} tone={key === 'missingDataWarning' ? 'warning' : 'neutral'}>
          {Array.isArray(value) ? (
            <ul className="space-y-1">
              {value.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          ) : (
            value
          )}
        </Callout>
      ))}

      {mod.sections.map((s, i) => (
        <SectionBlock key={s.id || i} section={s} />
      ))}
    </div>
  );
}
