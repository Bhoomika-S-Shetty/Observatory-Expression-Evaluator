import React from 'react';
import { Play, Loader2 } from 'lucide-react';

const TOP_NAV_ITEMS = [
  { id: 'lab', label: 'Laboratory' },
  { id: 'compare', label: 'Comparison Lab' },
  { id: 'testing', label: 'Testing Lab' },
  { id: 'history', label: 'History' },
  { id: 'complexity', label: 'Complexity' },
];

export default function Header({
  activeView,
  onSelectView,
  onEvaluate,
  isEvaluating,
}) {
  return (
    <header className="sticky top-0 z-30 bg-[#060913]/95 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectView('lab')}
          className="text-base font-bold tracking-wider text-white whitespace-nowrap shrink-0 cursor-pointer"
        >
          OBSERVATORY
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium" aria-label="Primary navigation">
          {TOP_NAV_ITEMS.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                  active
                    ? 'text-cyan-300 border-cyan-400'
                    : 'text-slate-400 hover:text-slate-100 border-transparent'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onEvaluate}
            disabled={isEvaluating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs sm:text-sm font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Compact mobile nav bar */}
      <div className="md:hidden flex items-center gap-4 px-4 py-2 border-t border-slate-800/60 overflow-x-auto text-xs font-medium">
        {TOP_NAV_ITEMS.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`whitespace-nowrap shrink-0 pb-0.5 border-b ${
                active ? 'text-cyan-300 border-cyan-400' : 'text-slate-400 border-transparent'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
