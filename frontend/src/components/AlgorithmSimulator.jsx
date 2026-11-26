import React, { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';

export function buildUnifiedTimeline(evaluation) {
  if (!evaluation) return [];

  const steps = [];
  const tokens = evaluation.tokens || [];
  const parsingTrace = evaluation.parsingTrace || [];
  const postfixEvalTrace = evaluation.postfixEvaluationTrace || [];
  const calcSteps = evaluation.calculationSteps || [];

  // Stage 1: Tokenization
  tokens.forEach((tok, idx) => {
    const scannedSoFar = tokens.slice(0, idx + 1).map((t) => t.semanticLabel || t.value);
    steps.push({
      globalIndex: steps.length,
      stage: 1,
      stageLabel: 'Tokenization',
      stageStep: idx + 1,
      stageTotal: tokens.length,
      currentToken: tok.value,
      tokenBadge: tok.semanticLabel || tok.type,
      operation: `SCAN_${tok.type}`,
      description: `Scanned '${tok.value}' at character index ${tok.position} -> ${tok.semanticLabel || tok.type}`,
      stackLabel: 'Lexer State',
      stackItems: [],
      outputLabel: 'Token Stream',
      outputItems: scannedSoFar,
      nodeId: null,
      calculationOrder: null,
    });
  });

  // Stage 2: Infix-to-Postfix (Shunting Yard)
  parsingTrace.forEach((row, idx) => {
    steps.push({
      globalIndex: steps.length,
      stage: 2,
      stageLabel: 'Infix → Postfix',
      stageStep: idx + 1,
      stageTotal: parsingTrace.length,
      currentToken: row.token,
      tokenBadge: row.tokenType,
      operation: row.operationType,
      description: row.action,
      stackLabel: 'Operator Stack (LIFO)',
      stackItems: row.stackItems || [],
      outputLabel: 'Postfix Output',
      outputItems: row.postfixItems || [],
      nodeId: null,
      calculationOrder: null,
    });
  });

  // Stage 3: Postfix Evaluation
  postfixEvalTrace.forEach((row, idx) => {
    const activeCalcCount =
      row.calculationOrder ||
      postfixEvalTrace
        .slice(0, idx + 1)
        .filter((r) => r.calculationOrder !== null && r.calculationOrder !== undefined)
        .length;

    const completedCalcs = calcSteps
      .slice(0, activeCalcCount)
      .map((c) => `${c.expression} = ${c.result}`);

    steps.push({
      globalIndex: steps.length,
      stage: 3,
      stageLabel: 'Postfix Evaluation',
      stageStep: idx + 1,
      stageTotal: postfixEvalTrace.length,
      currentToken: row.token,
      tokenBadge: row.actionType,
      operation: row.actionType,
      description: row.description,
      stackLabel: 'Operand Stack (LIFO)',
      stackItems: row.stackSnapshot || [],
      outputLabel: 'Intermediate Results',
      outputItems: completedCalcs.length > 0 ? completedCalcs : [`Stack top: ${(row.stackSnapshot || []).slice(-1)[0] ?? '∅'}`],
      nodeId: row.nodeId || null,
      calculationOrder: row.calculationOrder || activeCalcCount || null,
    });
  });

  return steps;
}

const OP_ACCENTS = {
  PUSH: 'text-cyan-300 border-cyan-500/35 bg-cyan-950/30',
  PUSH_OPERAND: 'text-cyan-300 border-cyan-500/35 bg-cyan-950/30',
  POP: 'text-purple-300 border-purple-500/35 bg-purple-950/30',
  APPLY_UNARY: 'text-purple-300 border-purple-500/35 bg-purple-950/30',
  APPLY_BINARY: 'text-amber-300 border-amber-500/35 bg-amber-950/30',
  OUTPUT: 'text-emerald-300 border-emerald-500/35 bg-emerald-950/30',
  DISCARD: 'text-amber-300 border-amber-500/35 bg-amber-950/30',
  COMPLETE: 'text-sky-300 border-sky-500/35 bg-sky-950/30',
};

export default function AlgorithmSimulator({
  evaluation,
  timeline,
  activeStepIndex,
  onChangeStep,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed,
}) {
  const currentStep = useMemo(() => {
    if (!timeline || timeline.length === 0) return null;
    const clamped = Math.min(Math.max(0, activeStepIndex), timeline.length - 1);
    return timeline[clamped];
  }, [timeline, activeStepIndex]);

  // Auto playback loop
  useEffect(() => {
    if (!isPlaying || !timeline || timeline.length === 0) return;
    const intervalMs = Math.round(750 / playbackSpeed);
    const timer = setInterval(() => {
      onChangeStep((prev) => {
        if (prev >= timeline.length - 1) {
          onTogglePlay(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, timeline, playbackSpeed, onChangeStep, onTogglePlay]);

  const stageIndices = useMemo(() => {
    const map = { 1: -1, 2: -1, 3: -1 };
    for (const s of timeline) {
      if (map[s.stage] === -1) map[s.stage] = s.globalIndex;
    }
    return map;
  }, [timeline]);

  if (!evaluation || !currentStep) {
    return (
      <section className="obs-surface rounded-lg p-5">
        <h2 className="text-sm font-semibold text-white">B. Algorithm Simulator</h2>
        <p className="text-xs text-slate-400 mt-2">
          Evaluate an expression in the Workspace or CLI to step through Tokenization, Shunting Yard Infix-to-Postfix conversion, and Postfix Stack Evaluation.
        </p>
      </section>
    );
  }

  const stageSteps = timeline.filter((s) => s.stage === currentStep.stage);
  const stackItems = currentStep.stackItems || [];
  const outputItems = currentStep.outputItems || [];
  const opStyle =
    OP_ACCENTS[currentStep.operation] ||
    'text-sky-300 border-sky-500/35 bg-sky-950/30';

  return (
    <section className="obs-surface rounded-lg p-4 sm:p-5 space-y-4">
      {/* Header & Stage Selector */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <h2 className="text-sm font-semibold text-white">
            B. Real-Time Algorithm Simulator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Step {currentStep.globalIndex + 1} of {timeline.length} · Live Java engine execution trace
          </p>
        </div>

        {/* 3 Stage Tabs */}
        <div className="inline-flex flex-wrap items-center p-1 rounded bg-[#050811] border border-slate-800 gap-1">
          {[
            { stage: 1, label: '1. Tokenization' },
            { stage: 2, label: '2. Infix → Postfix' },
            { stage: 3, label: '3. Postfix Eval' },
          ].map((tab) => {
            const isActive = currentStep.stage === tab.stage;
            const targetIdx = stageIndices[tab.stage];
            return (
              <button
                key={tab.stage}
                type="button"
                disabled={targetIdx === -1}
                onClick={() => {
                  onTogglePlay(false);
                  if (targetIdx !== -1) onChangeStep(targetIdx);
                }}
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/35'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transport & Scrubber Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 rounded bg-[#050811] border border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              onTogglePlay(false);
              onChangeStep(0);
            }}
            aria-label="Reset simulation"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onTogglePlay(false);
              onChangeStep((i) => Math.max(0, i - 1));
            }}
            disabled={currentStep.globalIndex <= 0}
            aria-label="Previous step"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 disabled:opacity-40 cursor-pointer whitespace-nowrap"
          >
            <SkipBack className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (currentStep.globalIndex >= timeline.length - 1) {
                onChangeStep(0);
                onTogglePlay(true);
              } else {
                onTogglePlay((p) => !p);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer whitespace-nowrap"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              onTogglePlay(false);
              onChangeStep((i) => Math.min(timeline.length - 1, i + 1));
            }}
            disabled={currentStep.globalIndex >= timeline.length - 1}
            aria-label="Next step"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 disabled:opacity-40 cursor-pointer whitespace-nowrap"
          >
            <span>Next</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed & Timeline Progress */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1 text-[11px] font-mono">
            {[0.5, 1, 2].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onChangeSpeed(spd)}
                className={`px-2 py-1 rounded border cursor-pointer ${
                  playbackSpeed === spd
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            Stage {currentStep.stage} · {currentStep.stageStep}/{currentStep.stageTotal}
          </span>
        </div>
      </div>

      {/* Live Execution Readout + Animated Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Animated LIFO Stack */}
        <div className="lg:col-span-4 p-3.5 rounded bg-[#050811] border border-slate-800/80 flex flex-col justify-between min-h-[12.5rem]">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
            <span className="font-medium text-slate-300">{currentStep.stackLabel}</span>
            <span className="font-mono text-slate-400 tabular-nums">
              size: {stackItems.length}
            </span>
          </div>

          <div className="flex-1 flex flex-col-reverse justify-start gap-1.5 py-2.5 overflow-y-auto max-h-48">
            <AnimatePresence initial={false}>
              {stackItems.length === 0 ? (
                <motion.div
                  key="empty-stack"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-xs font-mono text-slate-500 py-5 border border-dashed border-slate-800 rounded"
                >
                  {currentStep.stage === 1 ? 'Stateless Scan' : 'Empty Stack (∅)'}
                </motion.div>
              ) : (
                stackItems.map((item, idx) => {
                  const isTop = idx === stackItems.length - 1;
                  return (
                    <motion.div
                      key={`${currentStep.stage}-${idx}-${item}`}
                      layout
                      initial={{ opacity: 0, y: -14, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -12, scale: 0.92 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className={`px-3 py-1.5 rounded font-mono text-xs font-semibold flex items-center justify-between border ${
                        isTop
                          ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                          : 'bg-slate-900 border-slate-700/80 text-slate-300'
                      }`}
                    >
                      <span>{item}</span>
                      {isTop && <span className="text-[10px] text-cyan-300">TOP</span>}
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Current Token, Operation, Description, Output */}
        <div className="lg:col-span-8 p-3.5 rounded bg-[#050811] border border-slate-800/80 flex flex-col justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded bg-slate-900/70 border border-slate-800">
              <div className="text-[11px] text-slate-400">Current Token</div>
              <div className="font-mono text-base font-bold text-cyan-300 mt-0.5 truncate">
                {currentStep.currentToken}
              </div>
              <div className="font-mono text-[10px] text-slate-500 truncate">
                {currentStep.tokenBadge}
              </div>
            </div>

            <div className={`p-2.5 rounded border col-span-1 sm:col-span-2 ${opStyle}`}>
              <div className="text-[11px] opacity-80">Current Operation</div>
              <div className="font-mono text-xs font-semibold mt-0.5">
                {currentStep.operation}
              </div>
              <div className="text-xs text-slate-200 mt-1 leading-snug">
                {currentStep.description}
              </div>
            </div>
          </div>

          {/* Output Buffer */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{currentStep.outputLabel}</span>
              <span className="font-mono tabular-nums">{outputItems.length} items</span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded bg-slate-900/70 border border-slate-800 min-h-[2.5rem] items-center max-h-28 overflow-y-auto">
              {outputItems.length === 0 ? (
                <span className="text-xs font-mono text-slate-500">∅</span>
              ) : (
                outputItems.map((out, i) => {
                  const isNewest = i === outputItems.length - 1;
                  return (
                    <motion.span
                      key={`${currentStep.stage}-${i}-${out}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.15 }}
                      className={`px-2 py-0.5 rounded font-mono text-xs border ${
                        isNewest
                          ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-200'
                          : 'bg-slate-800/80 border-slate-700 text-slate-200'
                      }`}
                    >
                      {out}
                    </motion.span>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stage Execution Table */}
      <div className="overflow-x-auto rounded border border-slate-800/80 max-h-56 overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400">
            <tr>
              <th className="py-2 px-3 font-mono">#</th>
              <th className="py-2 px-3 font-mono">Token</th>
              <th className="py-2 px-3 font-mono">Operation</th>
              <th className="py-2 px-3 font-mono">Stack</th>
              <th className="py-2 px-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {stageSteps.map((row) => {
              const isRowActive = row.globalIndex === currentStep.globalIndex;
              return (
                <tr
                  key={row.globalIndex}
                  onClick={() => {
                    onTogglePlay(false);
                    onChangeStep(row.globalIndex);
                  }}
                  className={`cursor-pointer transition-colors ${
                    isRowActive
                      ? 'bg-cyan-500/15 text-white'
                      : 'hover:bg-slate-900/50 text-slate-300'
                  }`}
                >
                  <td className="py-2 px-3 font-mono tabular-nums text-slate-400">
                    {row.stageStep}
                  </td>
                  <td className="py-2 px-3 font-mono font-semibold text-cyan-300">
                    {row.currentToken}
                  </td>
                  <td className="py-2 px-3 font-mono text-purple-300">{row.operation}</td>
                  <td className="py-2 px-3 font-mono text-slate-300">
                    {row.stackItems.length > 0 ? `[${row.stackItems.join(', ')}]` : '∅'}
                  </td>
                  <td className="py-2 px-3 text-slate-200">{row.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
