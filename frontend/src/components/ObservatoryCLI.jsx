import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import {
  compareExpressions,
  evaluateExpression,
  fetchVariables,
  saveVariable,
  validateExpression,
} from '../services/expressionApi.js';

const CLI_COMMANDS = [
  'help',
  'set',
  'variables',
  'expr',
  'tokenize',
  'postfix',
  'tree',
  'run',
  'step',
  'history',
  'compare',
  'clear',
];

const QUICK_SNIPPETS = [
  'help',
  'set a 10',
  'set b 5',
  'expr -(a+b)*2+30/5',
  'tokenize',
  'postfix',
  'tree',
  'run',
  'step',
];

const INITIAL_LOGS = [
  {
    id: 'boot-1',
    tone: 'info',
    text: 'OBSERVATORY CLI ready. Connected to Java expression evaluation engine.',
  },
  {
    id: 'boot-2',
    tone: 'muted',
    text: "Type 'help' for available commands, or try: set a 10 -> set b 5 -> expr -(a+b)*2+30/5 -> run",
  },
];

const TONE_CLASS = {
  command: 'text-cyan-300 font-semibold',
  success: 'text-emerald-300',
  error: 'text-rose-400',
  info: 'text-sky-300',
  tree: 'text-purple-200',
  muted: 'text-slate-400',
};

export default function ObservatoryCLI({
  activeExpression,
  variables,
  history,
  timeline,
  activeStepIndex,
  onSyncVariables,
  onSyncExpression,
  onSyncEvaluation,
  onSyncError,
  onSyncStep,
  onSyncCompare,
  onClearHistory,
  onReopenHistoryEntry,
}) {
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyCursor, setHistoryCursor] = useState(-1);
  const [isBusy, setIsBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const appendLog = (entries) => {
    const items = (Array.isArray(entries) ? entries : [entries]).map((entry, idx) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${idx}`,
      ...entry,
    }));
    setLogs((prev) => [...prev.slice(-180), ...items]);
  };

  const executeCommand = async (rawLine) => {
    const trimmed = rawLine.trim();
    if (!trimmed) return;

    setCmdHistory((prev) => [trimmed, ...prev.slice(0, 49)]);
    setHistoryCursor(-1);
    appendLog({ tone: 'command', text: `observatory> ${trimmed}` });

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const rest = trimmed.slice(parts[0].length).trim();

    if (cmd === 'clear' || cmd === 'cls') {
      setLogs([]);
      return;
    }

    if (cmd === 'help' || cmd === '?') {
      appendLog([
        { tone: 'info', text: 'Available Observatory Commands:' },
        { tone: 'muted', text: '  set <var> <num>          Assign variable in Java HashMap (e.g. set a 10)' },
        { tone: 'muted', text: '  variables                Display all variables currently in Java HashMap' },
        { tone: 'muted', text: '  expr <expression>        Set active expression & validate syntax' },
        { tone: 'muted', text: '  tokenize [expression]    Run Java Tokenizer & display lexical tokens' },
        { tone: 'muted', text: '  postfix [expression]     Convert expression via Shunting Yard algorithm' },
        { tone: 'muted', text: '  tree [expression]        Build & display binary expression tree (syncs Explorer)' },
        { tone: 'muted', text: '  run [expression]         Evaluate expression via Java & sync all panels' },
        { tone: 'muted', text: '  step [next|prev|reset|N] Control synchronized Algorithm Simulator step-by-step' },
        { tone: 'muted', text: '  history [clear|open N]   List calculation history or reopen record #N' },
        { tone: 'muted', text: '  compare <a> | <b>        Compare two expressions side-by-side via Java' },
        { tone: 'muted', text: '  clear                    Clear terminal output' },
      ]);
      return;
    }

    setIsBusy(true);
    try {
      if (cmd === 'set') {
        // Support: set a 10 | set a = 10 | set a=10
        const eqNormalized = rest.replace(/\s*=\s*/g, ' ').trim();
        const setParts = eqNormalized.split(/\s+/);
        if (setParts.length !== 2 || !setParts[0]) {
          appendLog({
            tone: 'error',
            text: 'Usage: set <variable_name> <numeric_value> (e.g. set a 10)',
          });
          return;
        }
        const [vName, vRaw] = setParts;
        const vNum = Number(vRaw);
        if (Number.isNaN(vNum) || !Number.isFinite(vNum)) {
          appendLog({
            tone: 'error',
            text: `Invalid numeric value '${vRaw}' for variable '${vName}'.`,
          });
          return;
        }
        const res = await saveVariable(vName, vNum, true);
        onSyncVariables(res.variables || {});
        appendLog({
          tone: 'success',
          text: `Saved ${vName} = ${vNum} in Java HashMap.`,
        });
        return;
      }

      if (cmd === 'variables' || cmd === 'vars') {
        const res = await fetchVariables();
        const map = res.variables || {};
        onSyncVariables(map);
        const entries = Object.entries(map);
        if (entries.length === 0) {
          appendLog({ tone: 'muted', text: 'No variables defined in Java HashMap.' });
        } else {
          appendLog([
            { tone: 'info', text: `Active Java HashMap (${entries.length} variables):` },
            ...entries.map(([k, v]) => ({ tone: 'success', text: `  ${k} = ${v}` })),
          ]);
        }
        return;
      }

      if (cmd === 'expr') {
        if (!rest) {
          appendLog({
            tone: 'info',
            text: `Active expression: ${activeExpression || '(empty)'}`,
          });
          return;
        }
        onSyncExpression(rest);
        const valRes = await validateExpression(rest);
        if (valRes.valid) {
          appendLog({
            tone: 'success',
            text: `Expression set: ${rest} (${valRes.tokenCount} tokens · syntax valid)`,
          });
        } else {
          appendLog({
            tone: 'error',
            text: `Expression set with syntax warning [${valRes.stage}${
              valRes.position !== null && valRes.position !== undefined ? ` @ pos ${valRes.position}` : ''
            }]: ${valRes.message}`,
          });
        }
        return;
      }

      if (cmd === 'tokenize') {
        const target = rest || activeExpression;
        if (!target.trim()) {
          appendLog({ tone: 'error', text: 'No active expression. Use: expr <formula>' });
          return;
        }
        if (rest) onSyncExpression(rest);
        const valRes = await validateExpression(target);
        if (!valRes.valid) {
          appendLog({
            tone: 'error',
            text: `[${valRes.stage}${
              valRes.position !== null && valRes.position !== undefined ? ` @ pos ${valRes.position}` : ''
            }] ${valRes.message}`,
          });
          return;
        }
        appendLog([
          { tone: 'info', text: `Tokens (${valRes.tokens.length}) for '${target}':` },
          ...valRes.tokens.map((t, i) => ({
            tone: 'success',
            text: `  [${i + 1}] ${t.semanticLabel || t.type}  (lexeme='${t.value}', pos=${t.position})`,
          })),
        ]);
        return;
      }

      if (cmd === 'postfix') {
        const target = rest || activeExpression;
        if (!target.trim()) {
          appendLog({ tone: 'error', text: 'No active expression. Use: expr <formula>' });
          return;
        }
        if (rest) onSyncExpression(rest);
        const evalRes = await evaluateExpression(target);
        onSyncEvaluation(target, evalRes, false);
        appendLog([
          { tone: 'info', text: `Infix:   ${evalRes.originalExpression}` },
          { tone: 'success', text: `Postfix: ${evalRes.postfixExpression}` },
          {
            tone: 'muted',
            text: `Shunting Yard executed in ${evalRes.parsingTrace?.length || 0} stack steps.`,
          },
        ]);
        return;
      }

      if (cmd === 'tree') {
        const target = rest || activeExpression;
        if (!target.trim()) {
          appendLog({ tone: 'error', text: 'No active expression. Use: expr <formula>' });
          return;
        }
        if (rest) onSyncExpression(rest);
        const evalRes = await evaluateExpression(target);
        onSyncEvaluation(target, evalRes, false);
        appendLog([
          { tone: 'info', text: `Binary Expression Tree for '${target}':` },
          { tone: 'tree', text: evalRes.textTree || '(empty)' },
          {
            tone: 'muted',
            text: `Preorder: ${(evalRes.preorderTraversal || []).join(' ')} | Postorder: ${(evalRes.postorderTraversal || []).join(' ')}`,
          },
        ]);
        return;
      }

      if (cmd === 'run') {
        const target = rest || activeExpression;
        if (!target.trim()) {
          appendLog({ tone: 'error', text: 'No active expression. Use: expr <formula>' });
          return;
        }
        if (rest) onSyncExpression(rest);
        try {
          const evalRes = await evaluateExpression(target);
          onSyncEvaluation(target, evalRes, true);
          appendLog([
            {
              tone: 'info',
              text: `Resolved: ${evalRes.resolvedExpression || target} | Postfix: ${evalRes.postfixExpression}`,
            },
            ...(evalRes.intermediateCalculations || []).map((line, i) => ({
              tone: 'muted',
              text: `  Step ${i + 1}: ${line}`,
            })),
            {
              tone: 'success',
              text: `Result = ${evalRes.formattedResult} (${evalRes.executionTimeMicros} μs)`,
            },
          ]);
        } catch (err) {
          onSyncError(target, err, true);
          appendLog({
            tone: 'error',
            text: `[${err.stage || 'ERROR'}${
              err.position !== null && err.position !== undefined ? ` @ pos ${err.position}` : ''
            }] ${err.message}`,
          });
        }
        return;
      }

      if (cmd === 'step') {
        if (!timeline || timeline.length === 0) {
          appendLog({
            tone: 'error',
            text: "No active simulation timeline. Run an expression first with 'run'.",
          });
          return;
        }
        const sub = rest.toLowerCase();
        let nextIdx = activeStepIndex;
        if (!sub || sub === 'next' || sub === 'n') {
          nextIdx = Math.min(timeline.length - 1, activeStepIndex + 1);
        } else if (sub === 'prev' || sub === 'p' || sub === 'back') {
          nextIdx = Math.max(0, activeStepIndex - 1);
        } else if (sub === 'reset' || sub === '0') {
          nextIdx = 0;
        } else if (sub.startsWith('stage ')) {
          const st = Number(sub.replace('stage ', '').trim());
          const found = timeline.findIndex((s) => s.stage === st);
          if (found === -1) {
            appendLog({ tone: 'error', text: 'Invalid stage. Use: step stage 1 | 2 | 3' });
            return;
          }
          nextIdx = found;
        } else if (!Number.isNaN(Number(sub))) {
          const requested = Math.max(1, Math.min(timeline.length, Number(sub))) - 1;
          nextIdx = requested;
        } else {
          appendLog({
            tone: 'error',
            text: 'Usage: step [next | prev | reset | stage <1|2|3> | <step_number>]',
          });
          return;
        }

        onSyncStep(nextIdx);
        const s = timeline[nextIdx];
        appendLog([
          {
            tone: 'info',
            text: `[Step ${nextIdx + 1}/${timeline.length}] Stage ${s.stage} (${s.stageLabel}) · Token: ${s.currentToken} · Op: ${s.operation}`,
          },
          {
            tone: 'success',
            text: `  ${s.description} | Stack: [${(s.stackItems || []).join(', ')}]`,
          },
        ]);
        return;
      }

      if (cmd === 'history') {
        const sub = rest.toLowerCase();
        if (sub === 'clear') {
          onClearHistory();
          appendLog({ tone: 'success', text: 'Calculation history cleared.' });
          return;
        }
        if (sub.startsWith('open ')) {
          const idx = Number(sub.replace('open ', '').trim()) - 1;
          if (Number.isNaN(idx) || idx < 0 || idx >= history.length) {
            appendLog({ tone: 'error', text: `History entry #${idx + 1} not found.` });
            return;
          }
          await onReopenHistoryEntry(history[idx]);
          appendLog({
            tone: 'success',
            text: `Reopened history #${idx + 1}: ${history[idx].expression}`,
          });
          return;
        }
        if (history.length === 0) {
          appendLog({ tone: 'muted', text: 'Calculation history is empty.' });
        } else {
          appendLog([
            { tone: 'info', text: `Calculation History (${history.length} records):` },
            ...history.slice(0, 12).map((h, i) => ({
              tone: h.status === 'SUCCESS' ? 'success' : 'error',
              text: `  [${i + 1}] ${h.expression} -> ${
                h.status === 'SUCCESS' ? h.result : `ERROR: ${h.errorMessage}`
              }`,
            })),
          ]);
        }
        return;
      }

      if (cmd === 'compare') {
        const separator = rest.includes('|') ? '|' : rest.includes(' vs ') ? ' vs ' : null;
        if (!separator) {
          appendLog({
            tone: 'error',
            text: 'Usage: compare <expr1> | <expr2> (e.g. compare 10 + 5 * 2 | (10 + 5) * 2)',
          });
          return;
        }
        const [e1, e2] = rest.split(separator).map((s) => s.trim());
        if (!e1 || !e2) {
          appendLog({ tone: 'error', text: 'Provide two non-empty expressions separated by |.' });
          return;
        }
        const cmp = await compareExpressions(e1, e2, variables);
        onSyncCompare(e1, e2, cmp);
        appendLog([
          {
            tone: 'info',
            text: `Comparison: '${e1}' (${cmp.first?.formattedResult ?? 'ERR'}) vs '${e2}' (${cmp.second?.formattedResult ?? 'ERR'})`,
          },
          {
            tone: 'muted',
            text: `  Postfix 1: ${cmp.first?.postfixExpression ?? 'N/A'} | Postfix 2: ${cmp.second?.postfixExpression ?? 'N/A'}`,
          },
          {
            tone: cmp.resultsEqual ? 'success' : 'info',
            text: `  ${cmp.explanation}`,
          },
        ]);
        return;
      }

      appendLog({
        tone: 'error',
        text: `Unknown command '${cmd}'. Type 'help' to list valid Observatory commands.`,
      });
    } catch (err) {
      appendLog({
        tone: 'error',
        text: `[${err.stage || 'ERROR'}${
          err.position !== null && err.position !== undefined ? ` @ pos ${err.position}` : ''
        }] ${err.message}`,
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input;
      setInput('');
      executeCommand(val);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextCursor = Math.min(cmdHistory.length - 1, historyCursor + 1);
      setHistoryCursor(nextCursor);
      setInput(cmdHistory[nextCursor]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyCursor <= 0) {
        setHistoryCursor(-1);
        setInput('');
      } else {
        const nextCursor = historyCursor - 1;
        setHistoryCursor(nextCursor);
        setInput(cmdHistory[nextCursor]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const prefix = input.trim().toLowerCase();
      if (!prefix) return;
      const match = CLI_COMMANDS.find((c) => c.startsWith(prefix));
      if (match) setInput(match + ' ');
    }
  };

  return (
    <section className="obs-surface rounded-lg overflow-hidden flex flex-col">
      {/* Terminal Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#070b15] border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-semibold text-white">D. Observatory CLI</h2>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Live Java REPL · Up/Down history · Tab autocomplete
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? 'Collapse terminal' : 'Expand terminal'}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
          >
            {expanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            <span>{expanded ? 'Compact' : 'Expand'}</span>
          </button>
          <button
            type="button"
            onClick={() => setLogs([])}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Quick Session Commands */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#050811] border-b border-slate-800/60 overflow-x-auto">
        <span className="text-[11px] text-slate-500 shrink-0 mr-1">Session:</span>
        {QUICK_SNIPPETS.map((snippet) => (
          <button
            key={snippet}
            type="button"
            onClick={() => executeCommand(snippet)}
            disabled={isBusy}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 font-mono text-[11px] text-cyan-300 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {snippet}
          </button>
        ))}
      </div>

      {/* Terminal Output Stream */}
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        className={`px-4 py-3 bg-[#04060d] font-mono text-xs overflow-y-auto space-y-1 cursor-text ${
          expanded ? 'h-80' : 'h-48'
        }`}
      >
        {logs.map((entry) => (
          <pre
            key={entry.id}
            className={`whitespace-pre-wrap break-words leading-relaxed ${
              TONE_CLASS[entry.tone] || 'text-slate-200'
            }`}
          >
            {entry.text}
          </pre>
        ))}
        {isBusy && <div className="text-amber-300 text-xs">Executing in Java engine...</div>}
      </div>

      {/* Prompt Input */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#060913] border-t border-slate-800/80 font-mono text-xs">
        <span className="text-cyan-400 font-semibold shrink-0">observatory&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command (help, set a 10, expr -(a+b)*2+30/5, tokenize, postfix, tree, run, step)"
          aria-label="Observatory CLI command input"
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none"
        />
      </div>
    </section>
  );
}
