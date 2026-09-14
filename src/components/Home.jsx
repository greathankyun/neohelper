import { Link } from 'react-router-dom';
import { MODULES } from '../data';
import { colorOf } from '../theme';

export default function Home() {
  return (
    <div>
      <p className="text-ink/70 mb-5 max-w-2xl leading-relaxed">
        依主題分類的新生兒／早產兒臨床照護速查。點選下方主題查看篩檢時程、決策流程或劑量計算機。
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {MODULES.map((m) => {
          const c = colorOf(m.color);
          return (
            <Link
              key={m.id}
              to={`/module/${m.id}`}
              className={`block border border-rule border-l-4 ${c.edge} bg-white/50 hover:bg-white/80 transition-colors px-4 py-3`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-display font-semibold text-lg leading-snug">{m.title}</h2>
              </div>
              {m.subtitle && <p className="text-sm text-ink/70 mt-0.5">{m.subtitle}</p>}
              {m.sourceRef && <p className="font-mono text-[0.7rem] text-ink/40 mt-2">{m.sourceRef}</p>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
