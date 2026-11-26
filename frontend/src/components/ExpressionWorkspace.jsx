import React, { useRef, useState } from 'react';
import {
  Play,
  ShieldCheck,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Copy,
  Download,
  Keyboard,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Delete,
} from 'lucide-react';

export const EXAMPLE_EXPRESSIONS = [
  {
    id: 'observatory-main',
    label: 'Observatory Formula',
    expr: '-(a + b) * 2 + 30 / 5',
    vars: { a: 10, b: 5 },
    expected: '-24',
  },
  {
    id: 'precedence',
    label: 'Operator Precedence',
    expr: '10 + 5 * 2',
    vars: {},
    expected: '20',
  },
  {
    id: 'parens',
    label: 'Parentheses Grouping',
    expr: '(10 + 5) * 2',
    vars: {},
    expected: '30',
  },
  {
    id: 'nested-vars',
    label: 'Nested Variables',
    expr: '((a + b) * (c - d)) / 2',
    vars: { a: 10, b: 5, c: 8, d: 2 },
    expected: '45',
  },
  {
    id: 'real-div',
    label: 'Real-Valued Division',
    expr: '10 / 4',
    vars: {},
    expected: '2.5',
  },
  {
    id: 'unary-mul',
    label: 'Unary Negation',
    expr: '-5 * 3',
    vars: {},
    expected: '-15',
  },
  {
    id: 'double-neg',
    label: 'Subtract Negative',
    expr: '10 - -5',
    vars: {},
    expected: '15',
  },
  {
    id: 'deep-nest',
    label: 'Deep Grouping',
    expr: '((2 + 3) * (4 - 1)) / 5',
    vars: {},
    expected: '3',
  },
];

const KEYPAD_KEYS = [
  ['7', '8', '9', '/', '('],
  ['4', '5', '6', '*', ')'],
  ['1', '2', '3', '-', 'DEL'],
  ['0', '.', '+', 'CLR', '='],
];

function buildReport(evaluation) {
  const varsLines = Object.entries(evaluation.variablesUsed || {});
  return [
    '====================================================================',
    'OBSERVATORY — Expression Processing & Evaluation Laboratory Report',
    '====================================================================',
    `Timestamp:           ${new Date().toISOString()}`,
    `Status:              ${evaluation.status || 'SUCCESS'}`,
    `Original Expression: ${evaluation.originalExpression}`,
    `Resolved Expression: ${evaluation.resolvedExpression || evaluation.originalExpression}`,
    `Postfix Expression:  ${evaluation.postfixExpression}`,
    `Final Result:        ${evaluation.formattedResult}`,
    `Execution Time:      ${evaluation.executionTimeMicros} us`,
    '',
    '--- Variables Bound (Java HashMap) ---',
    ...(varsLines.length > 0 ? varsLines.map(([k, v]) => `  ${k} = ${v}`) : ['  (none)']),
    '',
    '--- Lexical Tokens ---',
    ...(evaluation.tokens || []).map(
      (t, i) => `  #${i + 1} ${t.semanticLabel || t.type} (pos ${t.position})`
    ),
    '',
    '--- Postfix Evaluation Trace ---',
    ...(evaluation.calculationSteps && evaluation.calculationSteps.length > 0
      ? evaluation.calculationSteps.map(
          (s) =>
            `  Step ${s.order}: ${s.expression} = ${s.result}  | Stack: [${(s.stackAfter || []).join(', ')}]`
        )
      : [`  Direct operand: ${evaluation.formattedResult}`]),
    '',
    '--- Binary Expression Tree ---',
    evaluation.textTree || '(unavailable)',
    '====================================================================',
  ].join('\n');
}

export default function ExpressionWorkspace({
  expression,
  onChangeExpression,
  onEvaluate,
  onValidate,
  onResetWorkspace,
  onLoadExample,
  validationResult,
  isValidating,
  evaluation,
  evalError,
  isEvaluating,
  variables,
  onAddVariable,
  onUpdateVariable,
  onDeleteVariable,
  onResetVariables,
  isVarBusy,
}) {
  const inputRef = useRef(null);
  const [showKeypad, setShowKeypad] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);

  // Variable form state
  const [varName, setVarName] = useState('');
  const [varVal, setVarVal] = useState('');
  const [varError, setVarError] = useState('');
  const [editingVar, setEditingVar] = useState(null);
  const [editingVal, setEditingVal] = useState('');

  const varEntries = Object.entries(variables || {});

  const insertAtCursor = (text) => {
    const el = inputRef.current;
    if (!el) {
      onChangeExpression((expression || '') + text);
      return;
    }
    const start = el.selectionStart ?? expression.length;
    const end = el.selectionEnd ?? expression.length;
    const next = expression.slice(0, start) + text + expression.slice(end);
    onChangeExpression(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleBackspace = () => {
    const el = inputRef.current;
    if (!el) {
      onChangeExpression(expression.slice(0, -1));
      return;
    }
    const start = el.selectionStart ?? expression.length;
    const end = el.selectionEnd ?? expression.length;
    if (start !== end) {
      onChangeExpression(expression.slice(0, start) + expression.slice(end));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start, start);
      });
    } else if (start > 0) {
      onChangeExpression(expression.slice(0, start - 1) + expression.slice(start));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start - 1, start - 1);
      });
    }
  };

  const handleKeypadPress = (key) => {
    if (key === 'DEL') {
      handleBackspace();
    } else if (key === 'CLR') {
      onChangeExpression('');
      inputRef.current?.focus();
    } else if (key === '=') {
      onEvaluate();
    } else {
      insertAtCursor(key);
    }
  };

  const handleAddVarSubmit = async (e) => {
    e.preventDefault();
    setVarError('');
    const trimmed = varName.trim();
    const num = Number(varVal);
    if (!trimmed) {
      setVarError('Enter a valid identifier (e.g. a, x1, velocity).');
      return;
    }
    if (varVal.trim() === '' || Number.isNaN(num) || !Number.isFinite(num)) {
      setVarError('Enter a finite integer or decimal value.');
      return;
    }
    try {
      await onAddVariable(trimmed, num, false);
      setVarName('');
      setVarVal('');
    } catch (err) {
      setVarError(err.message || 'Failed to add variable.');
    }
  };

  const commitVarEdit = async (name) => {
    setVarError('');
    const num = Number(editingVal);
    if (editingVal.trim() === '' || Number.isNaN(num) || !Number.isFinite(num)) {
      setVarError(`Invalid numeric value for '${name}'.`);
      return;
    }
    try {
      await onUpdateVariable(name, num);
      setEditingVar(null);
      setEditingVal('');
    } catch (err) {
      setVarError(err.message || 'Failed to update variable.');
    }
  };

  const copyText = async (key, value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      // Clipboard may be restricted
    }
  };

  const handleExport = () => {
    if (!evaluation) return;
    const blob = new Blob([buildReport(evaluation)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `observatory-lab-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeErrorPos =
    evalError?.position ??
    (validationResult && !validationResult.valid ? validationResult.position : null);

  return (
    <div className="space-y-4">
      {/* Section A Header & Editor */}
      <section className="obs-surface rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div>
            <h2 className="text-sm font-semibold text-white">A. Expression Workspace</h2>
            <p className="text-xs text-slate-400">
              Infix editor · Java HashMap symbol table · Max 2,000 tokens
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowKeypad((s) => !s)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
              showKeypad
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35'
                : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:text-white'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Keypad</span>
          </button>
        </div>

        {/* Example Library Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Example Expression Library</span>
            <span className="font-mono tabular-nums">{expression.length} chars</span>
          </div>
          <div className="relative">
            <select
              value=""
              onChange={(e) => {
                const found = EXAMPLE_EXPRESSIONS.find((ex) => ex.id === e.target.value);
                if (found) onLoadExample(found);
              }}
              aria-label="Load an example expression"
              className="w-full appearance-none pl-3 pr-8 py-2 rounded bg-[#050811] border border-slate-700/80 text-xs font-mono text-cyan-300 hover:border-cyan-500/50 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="">Load Example Preset...</option>
              {EXAMPLE_EXPRESSIONS.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.label}: {ex.expr} (= {ex.expected})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Code-Style Expression Input */}
        <div className="space-y-2">
          <textarea
            ref={inputRef}
            rows={2}
            value={expression}
            onChange={(e) => onChangeExpression(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onEvaluate();
              }
            }}
            placeholder="Enter formula, e.g. -(a + b) * 2 + 30 / 5"
            aria-label="Expression input"
            className="w-full px-3.5 py-2.5 rounded bg-[#050811] border border-slate-700/90 focus:border-cyan-400 focus:outline-none text-base font-mono text-white placeholder-slate-600 resize-y leading-relaxed"
          />

          {/* Exact Error Pointer Ruler */}
          {activeErrorPos !== null && activeErrorPos !== undefined && expression && (
            <div className="px-3 py-2 rounded bg-rose-950/25 border border-rose-500/35 font-mono text-xs overflow-x-auto">
              <div className="text-slate-200 whitespace-pre">{expression}</div>
              <div className="text-rose-400 whitespace-pre">
                {' '.repeat(Math.min(activeErrorPos, expression.length))}^ pos {activeErrorPos}
              </div>
            </div>
          )}

          {/* Primary Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onEvaluate}
              disabled={isEvaluating}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isEvaluating ? 'Calculating...' : 'Calculate'}</span>
            </button>
            <button
              type="button"
              onClick={onValidate}
              disabled={isValidating || isEvaluating}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/35 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isValidating ? 'Checking...' : 'Validate'}</span>
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              aria-label="Backspace"
              className="inline-flex items-center justify-center px-2.5 py-2 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors cursor-pointer"
            >
              <Delete className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onResetWorkspace}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Toggleable Mathematical Keypad */}
        {showKeypad && (
          <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-slate-800/80">
            {KEYPAD_KEYS.flat().map((key) => {
              const isOp = ['+', '-', '*', '/'].includes(key);
              const isParen = ['(', ')'].includes(key);
              const isEval = key === '=';
              const isAction = key === 'DEL' || key === 'CLR';
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeypadPress(key)}
                  className={`h-9 rounded font-mono text-xs font-semibold border transition-colors cursor-pointer ${
                    isEval
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-400'
                      : isOp
                        ? 'bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border-indigo-500/30'
                        : isParen
                          ? 'bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 border-cyan-500/25'
                          : isAction
                            ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                            : 'bg-[#050811] hover:bg-slate-800 text-slate-100 border-slate-800'
                  }`}
                >
                  {key}
                </button>
              );
            })}
          </div>
        )}

        {/* Validation Status Banner */}
        {validationResult && (
          <div
            className={`p-3 rounded border text-xs flex items-start gap-2 ${
              validationResult.valid
                ? 'bg-emerald-950/25 border-emerald-500/35 text-emerald-200'
                : 'bg-rose-950/25 border-rose-500/35 text-rose-200'
            }`}
          >
            {validationResult.valid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <div className="font-semibold">
                {validationResult.valid ? 'Syntax Validated' : `Rejected (${validationResult.stage})`}
              </div>
              <div className="mt-0.5">{validationResult.message}</div>
              {validationResult.valid && validationResult.postfixExpression && (
                <div className="font-mono text-cyan-300 mt-1 break-all">
                  Postfix: {validationResult.postfixExpression}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Final Result Readout */}
      <section
        className={`rounded-lg p-4 space-y-3 ${
          evalError
            ? 'obs-surface border-rose-500/40 bg-rose-950/15'
            : 'obs-surface-elevated'
        }`}
      >
        {evalError ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>ERROR · {evalError.stage || 'VALIDATION'}</span>
              {evalError.position !== null && evalError.position !== undefined && (
                <span className="text-rose-300">· pos {evalError.position}</span>
              )}
            </div>
            <p className="text-xs text-rose-100 leading-relaxed">{evalError.message}</p>
          </div>
        ) : evaluation ? (
          <>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>EVALUATED</span>
              </span>
              <span className="font-mono tabular-nums">
                {evaluation.tokens?.length || 0} tokens · {evaluation.executionTimeMicros} μs
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-slate-400">Final Result</span>
              <span className="text-3xl font-mono font-bold text-cyan-300 tabular-nums tracking-tight">
                {isEvaluating ? '...' : evaluation.formattedResult}
              </span>
            </div>

            <div className="space-y-1 text-[11px] font-mono pt-2 border-t border-slate-800/80">
              {evaluation.resolvedExpression && (
                <div className="text-slate-400 truncate" title={evaluation.resolvedExpression}>
                  Resolved: <span className="text-sky-300">{evaluation.resolvedExpression}</span>
                </div>
              )}
              <div className="text-slate-400 truncate" title={evaluation.postfixExpression}>
                Postfix: <span className="text-purple-300">{evaluation.postfixExpression}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => copyText('res', evaluation.formattedResult)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium bg-[#050811] hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer whitespace-nowrap"
              >
                {copiedKey === 'res' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
                <span>{copiedKey === 'res' ? 'Copied' : 'Copy Result'}</span>
              </button>
              <button
                type="button"
                onClick={() => copyText('rpn', evaluation.postfixExpression)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium bg-[#050811] hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer whitespace-nowrap"
              >
                {copiedKey === 'rpn' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
                <span>{copiedKey === 'rpn' ? 'Copied' : 'Copy Postfix'}</span>
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 cursor-pointer whitespace-nowrap ml-auto"
              >
                <Download className="w-3 h-3" />
                <span>Export .txt</span>
              </button>
            </div>
          </>
        ) : (
          <div className="text-xs text-slate-400">
            Enter an expression or run commands in the CLI below.
          </div>
        )}
      </section>

      {/* Variable Environment (Java HashMap) */}
      <section className="obs-surface rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
          <div>
            <h3 className="text-xs font-semibold text-white">
              Variable Environment (HashMap)
            </h3>
            <p className="text-[11px] text-slate-400">
              Click a symbol to insert · {varEntries.length} active
            </p>
          </div>
          <button
            type="button"
            onClick={onResetVariables}
            disabled={isVarBusy}
            className="text-[11px] font-medium text-cyan-300 hover:text-cyan-200 cursor-pointer whitespace-nowrap"
          >
            Reset (a, b, c)
          </button>
        </div>

        <form onSubmit={handleAddVarSubmit} className="grid grid-cols-12 gap-1.5">
          <input
            type="text"
            value={varName}
            onChange={(e) => setVarName(e.target.value)}
            placeholder="name"
            aria-label="Variable name"
            className="col-span-4 px-2.5 py-1.5 rounded bg-[#050811] border border-slate-700/80 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <input
            type="number"
            step="any"
            value={varVal}
            onChange={(e) => setVarVal(e.target.value)}
            placeholder="value"
            aria-label="Variable value"
            className="col-span-5 px-2.5 py-1.5 rounded bg-[#050811] border border-slate-700/80 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={isVarBusy}
            className="col-span-3 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-60 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>

        {varError && (
          <div className="text-[11px] text-rose-300 bg-rose-950/30 border border-rose-500/30 rounded px-2.5 py-1.5">
            {varError}
          </div>
        )}

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
          {varEntries.length === 0 ? (
            <div className="text-xs text-slate-500 py-2">No variables defined.</div>
          ) : (
            varEntries.map(([name, val]) => {
              const isEditing = editingVar === name;
              return (
                <div
                  key={name}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-[#050811] border border-slate-800/80"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => insertAtCursor(name)}
                      className="font-mono text-xs font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer truncate"
                      title={`Insert ${name} into expression`}
                    >
                      {name}
                    </button>
                    <span className="text-slate-600 font-mono text-xs">=</span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="any"
                        value={editingVal}
                        onChange={(e) => setEditingVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitVarEdit(name);
                          if (e.key === 'Escape') setEditingVar(null);
                        }}
                        autoFocus
                        className="w-20 px-1.5 py-0.5 rounded bg-slate-900 border border-cyan-500/50 text-xs font-mono text-white focus:outline-none"
                      />
                    ) : (
                      <span className="font-mono text-xs text-slate-200 tabular-nums">
                        {val}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => commitVarEdit(name)}
                          aria-label={`Save ${name}`}
                          className="p-1 rounded text-emerald-400 hover:bg-emerald-500/15 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingVar(null)}
                          aria-label="Cancel edit"
                          className="p-1 rounded text-slate-400 hover:bg-slate-800 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVar(name);
                            setEditingVal(String(val));
                            setVarError('');
                          }}
                          aria-label={`Edit ${name}`}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteVariable(name)}
                          aria-label={`Delete ${name}`}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
