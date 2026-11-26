import React from 'react';
import { History, RotateCcw, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function HistoryPanel({ history, onReopenEntry, onClearHistory }) {
  return (
    <div className="space-y-6">
      <section className="obs-surface rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Calculation History</h2>
            <p className="text-sm text-slate-400 mt-1">
              Persistent log of previous evaluations, variable bindings, final results, and status. Reopen any record to re-evaluate and inspect.
            </p>
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-500/25 transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </section>

      <section className="obs-surface rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Recorded Calculations</span>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {history.length} {history.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No calculations recorded yet. Evaluate an expression from the Overview or Editor to log it here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4 font-mono">Expression</th>
                  <th className="py-3 px-4 font-mono">Variables Used</th>
                  <th className="py-3 px-4 font-mono">Final Result</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((entry) => {
                  const varPairs = Object.entries(entry.variables || {});
                  return (
                    <tr key={entry.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap font-mono tabular-nums">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-300 max-w-xs break-words">
                        {entry.expression}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-300">
                        {varPairs.length > 0
                          ? varPairs.map(([k, v]) => `${k}=${v}`).join(', ')
                          : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-white tabular-nums max-w-xs break-words">
                        {entry.status === 'SUCCESS' ? entry.result : entry.errorMessage}
                      </td>
                      <td className="py-3 px-4">
                        {entry.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>SUCCESS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-rose-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>ERROR</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onReopenEntry(entry)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 cursor-pointer whitespace-nowrap"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reopen</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
