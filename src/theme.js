// Maps each module's named "color" to a consistent set of Tailwind classes.
// Kept centralized so the flowsheet palette stays coherent across modules.
export const COLOR_MAP = {
  teal: { edge: 'border-teal-700', text: 'text-teal-800', chip: 'bg-teal-700/10 text-teal-800 border-teal-700/30' },
  amber: { edge: 'border-amber-700', text: 'text-amber-800', chip: 'bg-amber-700/10 text-amber-800 border-amber-700/30' },
  rose: { edge: 'border-rose-800', text: 'text-rose-900', chip: 'bg-rose-800/10 text-rose-900 border-rose-800/30' },
  sky: { edge: 'border-sky-700', text: 'text-sky-800', chip: 'bg-sky-700/10 text-sky-800 border-sky-700/30' },
  indigo: { edge: 'border-indigo-700', text: 'text-indigo-800', chip: 'bg-indigo-700/10 text-indigo-800 border-indigo-700/30' },
  violet: { edge: 'border-violet-700', text: 'text-violet-800', chip: 'bg-violet-700/10 text-violet-800 border-violet-700/30' },
  cyan: { edge: 'border-cyan-700', text: 'text-cyan-800', chip: 'bg-cyan-700/10 text-cyan-800 border-cyan-700/30' },
  lime: { edge: 'border-lime-700', text: 'text-lime-800', chip: 'bg-lime-700/10 text-lime-800 border-lime-700/30' },
  emerald: { edge: 'border-emerald-700', text: 'text-emerald-800', chip: 'bg-emerald-700/10 text-emerald-800 border-emerald-700/30' },
  fuchsia: { edge: 'border-fuchsia-700', text: 'text-fuchsia-800', chip: 'bg-fuchsia-700/10 text-fuchsia-800 border-fuchsia-700/30' },
  slate: { edge: 'border-slate-700', text: 'text-slate-800', chip: 'bg-slate-700/10 text-slate-800 border-slate-700/30' },
  blue: { edge: 'border-blue-700', text: 'text-blue-800', chip: 'bg-blue-700/10 text-blue-800 border-blue-700/30' },
  stone: { edge: 'border-stone-700', text: 'text-stone-800', chip: 'bg-stone-700/10 text-stone-800 border-stone-700/30' },
};

export function colorOf(name) {
  return COLOR_MAP[name] || COLOR_MAP.slate;
}
