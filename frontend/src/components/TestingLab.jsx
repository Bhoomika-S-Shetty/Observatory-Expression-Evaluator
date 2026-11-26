import React, { useEffect, useState } from 'react';
import { Play, CheckCircle2, XCircle, Loader2, Eye, AlertTriangle } from 'lucide-react';
import {
  evaluateExpression,
  fetchTestCases,
  runAllTests,
  runSingleTest,
} from '../services/expressionApi.js';

const ERROR_PROBES = [
  { label: 'Invalid Character', expr: '10 + 5 ^ 2' },
  { label: 'Invalid Token (12ab)', expr: '12ab + 5' },
  { label: 'Missing Opening Paren', expr: '10 + 5)' },
  { label: 'Missing Closing Paren', expr: '(10 + 5' },
  { label: 'Empty Parentheses', expr: '()' },
  { label: 'Consecutive Binary Ops', expr: '10 + *' },
  { label: 'Missing Operand', expr: '10 + ( * 2)' },
  { label: 'Undefined Variable', expr: 'x + 5' },
  { label: 'Division by Zero', expr: '10 / 0' },
  { label: 'Invalid Decimal', expr: '1.2.3 + 4' },
  { label: 'Trailing Operator', expr: '10 +' },
  { label: 'Invalid Leading Op', expr: '* 5 + 2' },
  { label: 'Malformed Nested', expr: '((10 + 5) * )' },
];

export default function TestingLab({ onInspectEvaluation, activeError, activeExpression }) {
  const [predefinedCases, setPredefinedCases] = useState([]);
  const [resultsByName, setResultsByName] = useState({});
  const [runningTestName, setRunningTestName] = useState(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [suiteError, setSuiteError] = useState('');

  // Error probe state
  const [probeExpr, setProbeExpr] = useState(activeExpression || '10 + *');
  const [probeDiag, setProbeDiag] = useState(activeError || null);
  const [isProbing, setIsProbing] = useState(false);

  // Custom test form
  const [customName, setCustomName] = useState('Observatory Formula Check');
  const [customExpr, setCustomExpr] = useState('-(a+b)*2+30/5');
  const [customVarsJson, setCustomVarsJson] = useState('{"a": 10, "b": 5}');
  const [customExpectedType, setCustomExpectedType] = useState('VALUE');
  const [customExpectedVal, setCustomExpectedVal] = useState('-24');
  const [customExpectedErr, setCustomExpectedErr] = useState('Division by zero');
  const [customResult, setCustomResult] = useState(null);
  const [isRunningCustom, setIsRunningCustom] = useState(false);
  const [customFormError, setCustomFormError] = useState('');

  useEffect(() => {
    let mounted = true;
    fetchTestCases()
      .then((res) => {
        if (mounted && Array.isArray(res.cases)) {
          setPredefinedCases(res.cases);
        }
      })
      .catch((err) => {
        if (mounted) setSuiteError(err.message || 'Unable to load test suite from Java backend.');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleExecuteSingleCase = async (tc) => {
    setRunningTestName(tc.name);
    setSuiteError('');
    try {
      const res = await runSingleTest(tc);
      setResultsByName((prev) => ({ ...prev, [tc.name]: res }));
    } catch (err) {
      setSuiteError(err.message || `Failed to run test '${tc.name}'.`);
    } finally {
      setRunningTestName(null);
    }
  };

  const handleRunAll = async () => {
    setIsRunningAll(true);
    setSuiteError('');
    try {
      const data = await runAllTests();
      const map = {};
      for (const r of data.results || []) {
        map[r.name] = r;
      }
      setResultsByName(map);
    } catch (err) {
      setSuiteError(err.message || 'Failed to execute test suite.');
    } finally {
      setIsRunningAll(false);
    }
  };

  const runErrorProbe = async (expr) => {
    setProbeExpr(expr);
    setIsProbing(true);
    try {
      const res = await evaluateExpression(expr, {});
      setProbeDiag({
        valid: true,
        message: `Expression is valid and evaluates to ${res.formattedResult}.`,
        stage: 'SUCCESS',
        position: null,
      });
    } catch (err) {
      setProbeDiag({
        valid: false,
        message: err.message,
        stage: err.stage || 'ERROR',
        position: err.position ?? null,
      });
    } finally {
      setIsProbing(false);
    }
  };

  const handleRunCustom = async (e) => {
    e.preventDefault();
    setCustomFormError('');
    setIsRunningCustom(true);
    try {
      let parsedVars = {};
      if (customVarsJson.trim()) {
        parsedVars = JSON.parse(customVarsJson);
      }

      const payload = {
        name: customName.trim() || 'Custom Test',
        expression: customExpr,
        variables: parsedVars,
        expectedType: customExpectedType,
        expectedValue: customExpectedType === 'VALUE' ? Number(customExpectedVal) : null,
        expectedErrorContains: customExpectedType === 'ERROR' ? customExpectedErr : null,
      };

      const res = await runSingleTest(payload);
      setCustomResult(res);
    } catch (err) {
      setCustomFormError(err.message || 'Invalid test configuration.');
    } finally {
      setIsRunningCustom(false);
    }
  };

  const executedList = Object.values(resultsByName);
  const totalExecuted = executedList.length;
  const totalPassed = executedList.filter((r) => r.passed).length;
  const totalFailed = executedList.filter((r) => !r.passed).length;

  const highlightPos =
    probeDiag && !probeDiag.valid && probeDiag.position !== null && probeDiag.position !== undefined
      ? probeDiag.position
      : null;

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <section className="obs-surface rounded-lg p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Testing Lab</h2>
            <p className="text-sm text-slate-400 mt-1">
              Click any predefined normal or malformed test case below to execute it individually against Java, or run the full suite.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunAll}
            disabled={isRunningAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            {isRunningAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Suite...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run All Tests ({predefinedCases.length})</span>
              </>
            )}
          </button>
        </div>

        {suiteError && (
          <div className="mt-4 p-3.5 rounded bg-rose-950/30 border border-rose-500/35 text-sm text-rose-200">
            {suiteError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 mt-5 border-t border-slate-800/80">
          <div className="p-4 rounded bg-[#050811] border border-slate-800/80">
            <div className="text-xs text-slate-400">Executed / Total</div>
            <div className="text-2xl font-mono font-bold text-white tabular-nums mt-1">
              {totalExecuted} / {predefinedCases.length}
            </div>
          </div>
          <div className="p-4 rounded bg-[#050811] border border-emerald-500/30">
            <div className="text-xs text-emerald-400">Passed</div>
            <div className="text-2xl font-mono font-bold text-emerald-300 tabular-nums mt-1">
              {totalPassed}
            </div>
          </div>
          <div className="p-4 rounded bg-[#050811] border border-rose-500/30">
            <div className="text-xs text-rose-400">Failed</div>
            <div className="text-2xl font-mono font-bold text-rose-300 tabular-nums mt-1">
              {totalFailed}
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Predefined Test Cases Table */}
      <section className="obs-surface rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Predefined Normal &amp; Malformed Expression Suite
          </h3>
          <span className="text-xs text-slate-400">Click any row to execute</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-xs font-medium text-slate-400">
                <th className="py-3 px-4">Test Case</th>
                <th className="py-3 px-4 font-mono">Expression</th>
                <th className="py-3 px-4 font-mono">Expected</th>
                <th className="py-3 px-4 font-mono">Actual</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
              {predefinedCases.map((tc, idx) => {
                const res = resultsByName[tc.name];
                const isRunningThis = runningTestName === tc.name;
                const varsText = Object.entries(tc.variables || {})
                  .map(([k, v]) => `${k}=${v}`)
                  .join(', ');
                const exprDisplay =
                  tc.expression && tc.expression.length > 40
                    ? `${tc.expression.slice(0, 37)}... (${tc.expression.length} chars)`
                    : tc.expression;
                const expectedDisplay =
                  tc.expectedType === 'ERROR'
                    ? `Error: ${tc.expectedErrorContains}`
                    : String(tc.expectedValue);

                return (
                  <tr
                    key={`${idx}-${tc.name}`}
                    onClick={() => handleExecuteSingleCase(tc)}
                    className="hover:bg-slate-900/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-slate-100">{tc.name}</td>
                    <td className="py-3 px-4 font-mono text-cyan-300">
                      <div>{exprDisplay}</div>
                      {varsText && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{varsText}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{expectedDisplay}</td>
                    <td className="py-3 px-4 font-mono text-slate-200 max-w-xs break-words">
                      {isRunningThis ? (
                        <span className="text-amber-300">Running...</span>
                      ) : res ? (
                        res.actualOutput
                      ) : (
                        <span className="text-slate-500">Not run</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {!res ? (
                        <span className="font-mono text-xs text-slate-500">PENDING</span>
                      ) : res.passed ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>PASS</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-rose-400">
                          <XCircle className="w-4 h-4" />
                          <span>FAIL</span>
                        </span>
                      )}
                    </td>
                    <td
                      className="py-3 px-4 text-right space-x-2 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleExecuteSingleCase(tc)}
                        disabled={isRunningThis}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Run</span>
                      </button>
                      {res?.evaluationDetails && (
                        <button
                          type="button"
                          onClick={() => onInspectEvaluation(tc.expression, res.evaluationDetails)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/35 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Error Diagnostic Probes */}
      <section className="obs-surface rounded-lg p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-white">Interactive Error Diagnostic Probes</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Probe all 13 syntax and runtime error scenarios to inspect stage classification and character position pointers.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {ERROR_PROBES.map((probe) => (
            <button
              key={probe.label}
              type="button"
              onClick={() => runErrorProbe(probe.expr)}
              className="px-3 py-1.5 rounded text-xs bg-[#050811] hover:bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-slate-300 transition-colors cursor-pointer"
            >
              <span className="font-medium text-slate-200">{probe.label}:</span>{' '}
              <span className="font-mono text-rose-300">{probe.expr}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={probeExpr}
            onChange={(e) => setProbeExpr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runErrorProbe(probeExpr);
            }}
            placeholder="Enter malformed expression..."
            className="flex-1 px-3.5 py-2.5 rounded bg-[#050811] border border-slate-700/80 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={() => runErrorProbe(probeExpr)}
            disabled={isProbing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 cursor-pointer whitespace-nowrap"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{isProbing ? 'Analyzing...' : 'Probe Error'}</span>
          </button>
        </div>

        {probeDiag && (
          <div
            className={`p-4 rounded border space-y-2 ${
              probeDiag.valid
                ? 'bg-emerald-950/20 border-emerald-500/35'
                : 'bg-rose-950/25 border-rose-500/35'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className={probeDiag.valid ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {probeDiag.valid ? 'VALID EXPRESSION' : `REJECTED · ${probeDiag.stage}`}
              </span>
              {highlightPos !== null && (
                <span className="text-slate-300">· Position index {highlightPos}</span>
              )}
            </div>
            <div className="text-sm text-slate-100">{probeDiag.message}</div>
            {highlightPos !== null && probeExpr && (
              <div className="p-3 rounded bg-[#050811] border border-slate-800 font-mono text-xs overflow-x-auto">
                <div className="text-slate-200 whitespace-pre">{probeExpr}</div>
                <div className="text-rose-400 whitespace-pre">
                  {' '.repeat(Math.min(highlightPos, probeExpr.length))}^ here (pos {highlightPos})
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Custom Single Test Runner */}
      <section className="obs-surface rounded-lg p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-white">Custom Test Case Runner</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Execute an isolated test assertion via <code className="text-cyan-300">POST /api/test</code>.
          </p>
        </div>

        <form onSubmit={handleRunCustom} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Test Name</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full px-3.5 py-2 rounded bg-[#050811] border border-slate-700/80 text-sm text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Expression</label>
            <input
              type="text"
              value={customExpr}
              onChange={(e) => setCustomExpr(e.target.value)}
              className="w-full px-3.5 py-2 rounded bg-[#050811] border border-slate-700/80 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Variables (JSON Object)</label>
            <input
              type="text"
              value={customVarsJson}
              onChange={(e) => setCustomVarsJson(e.target.value)}
              className="w-full px-3.5 py-2 rounded bg-[#050811] border border-slate-700/80 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Expected Outcome</label>
              <select
                value={customExpectedType}
                onChange={(e) => setCustomExpectedType(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#050811] border border-slate-700/80 text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="VALUE">Numeric Value</option>
                <option value="ERROR">Validation/Runtime Error</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {customExpectedType === 'VALUE' ? 'Expected Value' : 'Expected Error Text'}
              </label>
              {customExpectedType === 'VALUE' ? (
                <input
                  type="number"
                  step="any"
                  value={customExpectedVal}
                  onChange={(e) => setCustomExpectedVal(e.target.value)}
                  className="w-full px-3.5 py-2 rounded bg-[#050811] border border-slate-700/80 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              ) : (
                <input
                  type="text"
                  value={customExpectedErr}
                  onChange={(e) => setCustomExpectedErr(e.target.value)}
                  className="w-full px-3.5 py-2 rounded bg-[#050811] border border-slate-700/80 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              )}
            </div>
          </div>

          <div className="md:col-span-2 flex items-center justify-between gap-4 pt-1">
            {customFormError ? (
              <span className="text-xs text-rose-400">{customFormError}</span>
            ) : (
              <span className="text-xs text-slate-400">Runs isolated from saved Variable Environment.</span>
            )}
            <button
              type="submit"
              disabled={isRunningCustom}
              className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold bg-indigo-500 hover:bg-indigo-400 text-white cursor-pointer whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunningCustom ? 'Running...' : 'Run Single Test'}</span>
            </button>
          </div>
        </form>

        {customResult && (
          <div className="p-4 rounded bg-[#050811] border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
            <div className="space-y-1">
              <div className="font-medium text-white">{customResult.name}</div>
              <div className="font-mono text-xs text-slate-400">
                Expected: <span className="text-slate-200">{customResult.expectedOutput}</span> · Actual:{' '}
                <span className="text-cyan-300">{customResult.actualOutput}</span>
              </div>
            </div>
            <div className="font-mono font-bold text-sm">
              {customResult.passed ? (
                <span className="text-emerald-400">● PASS</span>
              ) : (
                <span className="text-rose-400">✖ FAIL</span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
