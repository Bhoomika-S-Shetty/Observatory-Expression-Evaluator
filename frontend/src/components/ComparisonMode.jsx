import React, { useEffect, useState } from 'react';
import { GitCompare, Play, AlertTriangle, CheckCircle2, ArrowLeftRight } from 'lucide-react';
import { compareExpressions } from '../services/expressionApi.js';
import ExpressionTreeExplorer from './ExpressionTreeExplorer.jsx';

const COMPARISON_PRESETS = [
  {
    label: 'Precedence vs Parentheses',
    expr1: '10 + 5 * 2',
    expr2: '(10 + 5) * 2',
  },
  {
    label: 'Unary Scope Difference',
    expr1: '-5 + 3 * 2',
    expr2: '-(5 + 3) * 2',
  },
  {
    label: 'Left Associativity vs Grouping',
    expr1: '20 - 8 - 3',
    expr2: '20 - (8 - 3)',
  },
  {
    label: 'Observatory Formula Variant',
    expr1: '-(a + b) * 2 + 30 / 5',
    expr2: '-a + b * 2 + 30 / 5',
  },
];

export default function ComparisonMode({ variables, externalPair = null }) {
  const [expr1, setExpr1] = useState('10 + 5 * 2');
  const [expr2, setExpr2] = useState('(10 + 5) * 2');
  const [comparison, setComparison] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [traceMode, setTraceMode] = useState('eval'); // 'eval' | 'shunting'

  const runComparison = async (leftExpr = expr1, rightExpr = expr2) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await compareExpressions(leftExpr, rightExpr, variables);
      setComparison(data);
    } catch (err) {
      setError(err.message || 'Comparison failed.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (externalPair && externalPair.expr1 && externalPair.expr2) {
      setExpr1(externalPair.expr1);
      setExpr2(externalPair.expr2);
      setComparison(externalPair.result || null);
    } else {
      runComparison(expr1, expr2);
    }
  }, [externalPair]);

  return (
    <div className="space-y-6">
      <section className="obs-surface rounded-lg p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Comparison Lab</h2>
            <p className="text-sm text-slate-400 mt-1">
              Compare Expression A and Expression B side-by-side to inspect results, postfix forms, syntax trees, execution traces, and operator precedence effects.
            </p>
          </div>
          <button
            type="button"
            onClick={() => runComparison(expr1, expr2)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-60 cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isLoading ? 'Comparing...' : 'Compare'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {COMPARISON_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setExpr1(preset.expr1);
                setExpr2(preset.expr2);
                runComparison(preset.expr1, preset.expr2);
              }}
              className="px-3 py-1.5 rounded text-xs font-medium bg-[#050811] hover:bg-slate-900 text-slate-300 border border-slate-800 hover:border-cyan-500/40 transition-colors cursor-pointer whitespace-nowrap"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Expression A
            </label>
            <input
              type="text"
              value={expr1}
              onChange={(e) => setExpr1(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runComparison(expr1, expr2);
              }}
              className="w-full px-3.5 py-2.5 rounded bg-[#050811] border border-slate-700/80 text-base font-mono text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="md:col-span-1 flex justify-center pb-2.5 text-slate-500">
            <ArrowLeftRight className="w-5 h-5" />
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Expression B
            </label>
            <input
              type="text"
              value={expr2}
              onChange={(e) => setExpr2(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runComparison(expr1, expr2);
              }}
              className="w-full px-3.5 py-2.5 rounded bg-[#050811] border border-slate-700/80 text-base font-mono text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded bg-rose-950/30 border border-rose-500/35 text-sm text-rose-200">
            {error}
          </div>
        )}
      </section>

      {comparison && (
        <>
          {/* Results, Postfix & Precedence Explanation */}
          <section className="obs-surface-elevated rounded-lg p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <GitCompare className="w-4 h-4 text-cyan-400" />
                <span>Effect of Operator Precedence &amp; Grouping</span>
              </div>
              {comparison.comparable && (
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold ${
                    comparison.resultsEqual ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  {comparison.resultsEqual ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>EQUAL RESULTS</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>DIFFERENCE Δ = {comparison.formattedDifference}</span>
                    </>
                  )}
                </span>
              )}
            </div>

            <p className="text-sm text-slate-200 leading-relaxed">{comparison.explanation}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Expression A', data: comparison.first },
                { label: 'Expression B', data: comparison.second },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-4 rounded bg-[#050811] border border-slate-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{item.label}</span>
                    <span className={item.data?.success ? 'text-emerald-400' : 'text-rose-400'}>
                      {item.data?.status}
                    </span>
                  </div>
                  <div className="font-mono text-sm text-slate-200 break-all">
                    {item.data?.originalExpression}
                  </div>
                  {item.data?.success ? (
                    <>
                      <div className="text-2xl font-mono font-bold text-cyan-300 tabular-nums">
                        = {item.data.formattedResult}
                      </div>
                      <div className="text-xs font-mono text-slate-400 pt-1">
                        Postfix: <span className="text-purple-300">{item.data.postfixExpression}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-rose-300">{item.data?.errorMessage}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Dual Execution Traces */}
          <section className="obs-surface rounded-lg p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-semibold text-white">Side-by-Side Execution Traces</h3>
                <p className="text-xs text-slate-400">
                  Compare evaluation steps and Shunting Yard operator ordering.
                </p>
              </div>
              <div className="inline-flex items-center p-0.5 rounded bg-[#050811] border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTraceMode('eval')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer whitespace-nowrap ${
                    traceMode === 'eval'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Evaluation Steps
                </button>
                <button
                  type="button"
                  onClick={() => setTraceMode('shunting')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer whitespace-nowrap ${
                    traceMode === 'shunting'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Shunting Yard Trace
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[
                { label: 'Expression A Trace', data: comparison.first },
                { label: 'Expression B Trace', data: comparison.second },
              ].map((side) => (
                <div
                  key={side.label}
                  className="p-4 rounded bg-[#050811] border border-slate-800/80 space-y-2.5"
                >
                  <div className="text-xs font-semibold text-cyan-300">{side.label}</div>
                  {!side.data?.success ? (
                    <div className="text-xs text-rose-300">{side.data?.errorMessage || 'Failed'}</div>
                  ) : traceMode === 'eval' ? (
                    <div className="space-y-1.5 font-mono text-xs">
                      {(side.data.calculationSteps || []).length === 0 ? (
                        <div className="text-slate-400">
                          Direct operand = {side.data.formattedResult}
                        </div>
                      ) : (
                        side.data.calculationSteps.map((s) => (
                          <div
                            key={s.order}
                            className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-slate-900/70 border border-slate-800"
                          >
                            <span className="text-slate-300">
                              <span className="text-slate-500 mr-2">#{s.order}</span>
                              {s.expression} ={' '}
                              <span className="text-emerald-300 font-semibold">{s.result}</span>
                            </span>
                            <span className="text-purple-300 text-[11px]">
                              [{(s.stackAfter || []).join(', ')}]
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5 font-mono text-xs max-h-56 overflow-y-auto">
                      {(side.data.parsingTrace || []).map((t) => (
                        <div
                          key={t.step}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-slate-900/70 border border-slate-800"
                        >
                          <span className="text-slate-300 truncate">
                            <span className="text-slate-500 mr-1.5">#{t.step}</span>
                            <span className="text-cyan-300 mr-2">{t.token}</span>
                            {t.operationType}
                          </span>
                          <span className="text-emerald-300 shrink-0">{t.postfix}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Dual Expression Trees */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ExpressionTreeExplorer
              title="Expression A Tree"
              evaluation={comparison.first}
              heightClass="h-[340px]"
            />
            <ExpressionTreeExplorer
              title="Expression B Tree"
              evaluation={comparison.second}
              heightClass="h-[340px]"
            />
          </div>
        </>
      )}
    </div>
  );
}
