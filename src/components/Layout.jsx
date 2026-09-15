import { useMemo, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { MODULES, SEARCH_INDEX } from '../data';
import { colorOf } from '../theme';

function BrandMark() {
  return (
    <svg viewBox="0 0 100 100" className="w-7 h-7 shrink-0" aria-hidden="true">
      <rect width="100" height="100" rx="18" fill="#1F2A33" />
      <path
        d="M10 55 L28 55 L34 40 L44 68 L52 30 L60 55 L90 55"
        fill="none"
        stroke="#EFECDF"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="90" cy="55" r="5" fill="#B8452E" />
    </svg>
  );
}

function SearchBox() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return SEARCH_INDEX.filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        (m.subtitle || '').toLowerCase().includes(query) ||
        m.text.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [q]);

  return (
    <div className="relative flex-1 min-w-[180px] max-w-md">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="搜尋主題、藥物、關鍵字…"
        className="w-full border border-rule bg-white/70 px-3 py-1.5 text-sm outline-none focus:border-alert"
        aria-label="搜尋"
      />
      {open && q.trim() && (
        <div className="absolute z-20 mt-1 w-full max-h-80 overflow-y-auto border border-rule bg-paper shadow-sm">
          {results.length === 0 && <div className="px-3 py-2 text-sm text-ink/50">沒有符合的結果</div>}
          {results.map((r) => {
            const mod = MODULES.find((m) => m.id === r.id);
            const c = colorOf(mod?.color);
            return (
              <Link
                key={r.id}
                to={`/module/${r.id}`}
                className={`block px-3 py-2 text-sm border-b border-rule/60 last:border-b-0 hover:bg-ink/[0.05] border-l-4 ${c.edge}`}
              >
                <div className="font-medium">{r.title}</div>
                {r.subtitle && <div className="text-xs text-ink/60">{r.subtitle}</div>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavRail() {
  const navigate = useNavigate();
  const location = useLocation();
  const match = location.pathname.match(/^\/module\/([^/]+)$/);
  const currentId = match ? match[1] : '';

  return (
    <nav>
      <select
        value={currentId}
        onChange={(e) => {
          if (e.target.value) navigate(`/module/${e.target.value}`);
        }}
        className="w-full sm:w-auto max-w-full sm:max-w-xs border border-rule bg-white/70 px-3 py-1.5 text-sm outline-none focus:border-alert"
        aria-label="選擇主題"
      >
        <option value="" disabled>
          學習資料…
        </option>
        {MODULES.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
    </nav>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-paper/95 backdrop-blur-sm border-b border-rule">
        <div className="max-w-4xl mx-auto px-4 pt-3 pb-2">
          <div className="flex items-center gap-3 mb-3">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <BrandMark />
              <span className="font-display text-xl font-semibold tracking-tight">新生兒臨床手冊</span>
            </Link>
            <SearchBox />
            <Link
              to="/patients"
              className="shrink-0 text-sm px-3 py-1.5 border border-alert text-alert bg-alert/5 whitespace-nowrap"
            >
              病人追蹤
            </Link>
          </div>
          <NavRail />
        </div>
      </header>

      <main className="flex-1 bg-flowsheet-grid">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-rule bg-paper">
        <div className="max-w-4xl mx-auto px-4 py-4 text-xs text-ink/60 leading-relaxed">
          本工具內容整理自科內 2026 工作手冊（Neonatology 部分章節）與查房筆記，僅供院內臨床參考，不能取代最新版工作手冊、實際檢驗數值與主治醫師臨床判斷。若發現內容與現行流程不符，請以現場實際規定為準，並回報更新。
        </div>
      </footer>
    </div>
  );
}
