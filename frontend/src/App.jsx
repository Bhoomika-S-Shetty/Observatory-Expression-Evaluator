import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import ExpressionWorkspace from './components/ExpressionWorkspace.jsx';
import AlgorithmSimulator, { buildUnifiedTimeline } from './components/AlgorithmSimulator.jsx';
import ExpressionTreeExplorer from './components/ExpressionTreeExplorer.jsx';
import ObservatoryCLI from './components/ObservatoryCLI.jsx';
import ComparisonMode from './components/ComparisonMode.jsx';
import TestingLab from './components/TestingLab.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import LearningMode from './components/LearningMode.jsx';
import {
  checkBackendHealth,
  deleteVariable,
  evaluateExpression,
  fetchVariables,
  saveVariable,
  updateVariable,
  validateExpression,
} from './services/expressionApi.js';

const HISTORY_STORAGE_KEY = 'observatory_calculation_history_v1';

function loadSavedHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [activeView, setActiveView] = useState('lab'); // 'lab' | 'compare' | 'testing' | 'history' | 'complexity'
  const [labFocus, setLabFocus] = useState('all'); // 'all' | 'simulator' | 'tree'

  const [expression, setExpression] = useState('-(a + b) * 2 + 30 / 5');
  const [variables, setVariables] = useState({});
  const [evaluation, setEvaluation] = useState(null);
  const [evalError, setEvalError] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isVarBusy, setIsVarBusy] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  const [history, setHistory] = useState(loadSavedHistory);

  // Synchronized Algorithm Simulator State
  const timeline = useMemo(() => buildUnifiedTimeline(evaluation), [evaluation]);
  const [simStepIndex, setSimStepIndex] = useState(0);
  const [simPlaying, setSimPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);

  // Comparison external sync from CLI
  const [cliComparePair, setCliComparePair] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
    } catch {
      // Ignore storage quota errors
    }
  }, [history]);

  const appendHistory = useCallback((entry) => {
    setHistory((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        ...entry,
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const syncEvaluationSuccess = useCallback(
    (expr, data, recordHistory = true) => {
      setEvaluation(data);
      setEvalError(null);
      setValidationResult(null);
      setBackendOnline(true);
      setSimPlaying(false);

      const newTimeline = buildUnifiedTimeline(data);
      // Start simulator cleanly at Stage 3 completion or Stage 1 step 0?
      // Land on Stage 2/3 final step or first Stage 3 step? Let's default to Stage 3 first step if present, or last step so full result & tree show immediately!
      setSimStepIndex(newTimeline.length > 0 ? newTimeline.length - 1 : 0);

      if (recordHistory) {
        appendHistory({
          expression: expr,
          variables: data.variablesUsed || {},
          result: data.formattedResult,
          status: 'SUCCESS',
          errorMessage: null,
        });
      }
    },
    [appendHistory]
  );

  const syncEvaluationFailure = useCallback(
    (expr, err, recordHistory = true, varsOverride = null) => {
      setEvaluation(null);
      setSimPlaying(false);
      setSimStepIndex(0);
      const errPayload = {
        message: err.message || 'Evaluation failed.',
        stage: err.stage || 'ERROR',
        position: err.position ?? null,
      };
      setEvalError(errPayload);
      if (recordHistory) {
        appendHistory({
          expression: expr,
          variables: varsOverride || variables,
          result: null,
          status: 'ERROR',
          errorMessage: errPayload.message,
        });
      }
    },
    [appendHistory, variables]
  );

  const runEvaluation = useCallback(
    async (exprToEval, overrideVars = null, recordHistory = true) => {
      const targetExpr = typeof exprToEval === 'string' ? exprToEval : expression;
      setIsEvaluating(true);
      setEvalError(null);
      setValidationResult(null);
      try {
        const data = await evaluateExpression(targetExpr, overrideVars);
        syncEvaluationSuccess(targetExpr, data, recordHistory);
      } catch (err) {
        syncEvaluationFailure(targetExpr, err, recordHistory, overrideVars);
      } finally {
        setIsEvaluating(false);
      }
    },
    [expression, syncEvaluationSuccess, syncEvaluationFailure]
  );

  const handleValidateOnly = useCallback(async () => {
    setIsValidating(true);
    try {
      const res = await validateExpression(expression);
      setValidationResult(res);
    } catch (err) {
      setValidationResult({
        valid: false,
        status: 'INVALID',
        stage: err.stage || 'VALIDATION',
        position: err.position ?? null,
        message: err.message || 'Validation failed.',
      });
    } finally {
      setIsValidating(false);
    }
  }, [expression]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      let attempts = 0;
      while (mounted && attempts < 10) {
        try {
          await checkBackendHealth();
          if (!mounted) return;
          setBackendOnline(true);
          const varData = await fetchVariables();
          if (!mounted) return;
          setVariables(varData.variables || {});
          const evalData = await evaluateExpression('-(a + b) * 2 + 30 / 5');
          if (!mounted) return;
          syncEvaluationSuccess('-(a + b) * 2 + 30 / 5', evalData, false);
          return;
        } catch {
          attempts += 1;
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [syncEvaluationSuccess]);

  const handleAddVariable = async (name, value, overwrite = false) => {
    setIsVarBusy(true);
    try {
      const res = await saveVariable(name, value, overwrite);
      setVariables(res.variables || {});
    } finally {
      setIsVarBusy(false);
    }
  };

  const handleUpdateVariable = async (name, value) => {
    setIsVarBusy(true);
    try {
      const res = await updateVariable(name, value);
      setVariables(res.variables || {});
    } finally {
      setIsVarBusy(false);
    }
  };

  const handleDeleteVariable = async (name) => {
    setIsVarBusy(true);
    try {
      const res = await deleteVariable(name);
      setVariables(res.variables || {});
    } finally {
      setIsVarBusy(false);
    }
  };

  const handleResetVariables = async () => {
    setIsVarBusy(true);
    try {
      await saveVariable('a', 10, true);
      await saveVariable('b', 5, true);
      const res = await saveVariable('c', -3.5, true);
      setVariables(res.variables || {});
    } finally {
      setIsVarBusy(false);
    }
  };

  const applyVariablesAndEvaluate = async (expr, varsMap) => {
    setExpression(expr);
    if (varsMap && Object.keys(varsMap).length > 0) {
      setIsVarBusy(true);
      try {
        let latest = variables;
        for (const [name, val] of Object.entries(varsMap)) {
          const res = await saveVariable(name, val, true);
          latest = res.variables || latest;
        }
        setVariables(latest);
      } finally {
        setIsVarBusy(false);
      }
    }
    await runEvaluation(expr, varsMap && Object.keys(varsMap).length > 0 ? varsMap : null, true);
  };

  const handleLoadExample = async (example) => {
    await applyVariablesAndEvaluate(example.expr, example.vars);
  };

  const handleResetWorkspace = () => {
    setExpression('');
    setEvaluation(null);
    setEvalError(null);
    setValidationResult(null);
    setSimPlaying(false);
    setSimStepIndex(0);
  };

  const handleReopenHistory = async (entry) => {
    setActiveView('lab');
    await applyVariablesAndEvaluate(entry.expression, entry.variables);
  };

  const handleInspectEvaluation = (expr, evalPayload) => {
    setExpression(expr);
    syncEvaluationSuccess(expr, evalPayload, false);
    setActiveView('lab');
  };

  // Current synchronized step from Algorithm Simulator -> Expression Tree Explorer
  const currentSimStep =
    timeline.length > 0
      ? timeline[Math.min(Math.max(0, simStepIndex), timeline.length - 1)]
      : null;
  const highlightedNodeId = currentSimStep?.nodeId || null;
  const activeCalculationOrder =
    currentSimStep?.stage === 3 ? currentSimStep.calculationOrder : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#05070e] text-slate-100 obs-star-grid">
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        onEvaluate={() => runEvaluation(expression)}
        isEvaluating={isEvaluating}
      />

      <main className="flex-1 w-full max-w-[1520px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        {activeView === 'lab' && (
          <>
            {/* Observatory Laboratory Telemetry Header */}
            <section className="obs-surface rounded-lg px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h1 className="text-base sm:text-lg font-semibold text-white">
                  Interactive Expression Processing &amp; Evaluation Laboratory
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className={backendOnline ? 'text-emerald-400 font-medium' : 'text-amber-300 font-medium'}>
                    {backendOnline ? '● Java Engine Ready' : '▲ Connecting to Java Engine'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-slate-300 truncate max-w-md">
                    {expression?.trim() ? expression : '(empty)'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {Object.keys(variables).length} vars · {history.length} runs
                  </span>
                </div>
              </div>

              {/* Layout Focus Controls */}
              <div className="inline-flex items-center p-0.5 rounded bg-[#050811] border border-slate-800 self-start lg:self-auto">
                {[
                  { id: 'all', label: 'Unified Lab' },
                  { id: 'simulator', label: 'Focus Simulator' },
                  { id: 'tree', label: 'Focus Tree' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setLabFocus(mode.id)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      labFocus === mode.id
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Primary IDE Workbench Grid: Section A (Left) + Sections B & C (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* SECTION A: Expression Workspace */}
              <div className="lg:col-span-4 xl:col-span-4">
                <ExpressionWorkspace
                  expression={expression}
                  onChangeExpression={(val) => {
                    setExpression(val);
                    setValidationResult(null);
                  }}
                  onEvaluate={() => runEvaluation(expression)}
                  onValidate={handleValidateOnly}
                  onResetWorkspace={handleResetWorkspace}
                  onLoadExample={handleLoadExample}
                  validationResult={validationResult}
                  isValidating={isValidating}
                  evaluation={evaluation}
                  evalError={evalError}
                  isEvaluating={isEvaluating}
                  variables={variables}
                  onAddVariable={handleAddVariable}
                  onUpdateVariable={handleUpdateVariable}
                  onDeleteVariable={handleDeleteVariable}
                  onResetVariables={handleResetVariables}
                  isVarBusy={isVarBusy}
                />
              </div>

              {/* SECTIONS B & C: Algorithm Simulator + Expression Tree Explorer */}
              <div className="lg:col-span-8 xl:col-span-8 space-y-5">
                {labFocus !== 'tree' && (
                  <AlgorithmSimulator
                    evaluation={evaluation}
                    timeline={timeline}
                    activeStepIndex={simStepIndex}
                    onChangeStep={setSimStepIndex}
                    isPlaying={simPlaying}
                    onTogglePlay={setSimPlaying}
                    playbackSpeed={simSpeed}
                    onChangeSpeed={setSimSpeed}
                  />
                )}

                {labFocus !== 'simulator' && (
                  <ExpressionTreeExplorer
                    evaluation={evaluation}
                    highlightedNodeId={highlightedNodeId}
                    activeCalculationOrder={activeCalculationOrder}
                    heightClass={labFocus === 'tree' ? 'h-[520px]' : 'h-[400px]'}
                  />
                )}
              </div>
            </div>

            {/* SECTION D: Observatory CLI */}
            <ObservatoryCLI
              activeExpression={expression}
              variables={variables}
              history={history}
              timeline={timeline}
              activeStepIndex={simStepIndex}
              onSyncVariables={setVariables}
              onSyncExpression={(nextExpr) => {
                setExpression(nextExpr);
                setValidationResult(null);
              }}
              onSyncEvaluation={syncEvaluationSuccess}
              onSyncError={syncEvaluationFailure}
              onSyncStep={(nextIdx) => {
                setSimPlaying(false);
                setSimStepIndex(nextIdx);
              }}
              onSyncCompare={(e1, e2, result) => {
                setCliComparePair({ expr1: e1, expr2: e2, result });
              }}
              onClearHistory={() => setHistory([])}
              onReopenHistoryEntry={handleReopenHistory}
            />
          </>
        )}

        {activeView === 'compare' && (
          <ComparisonMode variables={variables} externalPair={cliComparePair} />
        )}

        {activeView === 'testing' && (
          <TestingLab
            onInspectEvaluation={handleInspectEvaluation}
            activeError={evalError}
            activeExpression={expression}
          />
        )}

        {activeView === 'history' && (
          <HistoryPanel
            history={history}
            onReopenEntry={handleReopenHistory}
            onClearHistory={() => setHistory([])}
          />
        )}

        {activeView === 'complexity' && (
          <LearningMode onLoadIntoWorkspace={handleInspectEvaluation} />
        )}
      </main>
    </div>
  );
}
