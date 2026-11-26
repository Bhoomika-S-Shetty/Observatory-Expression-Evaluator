import React, { useState } from 'react';
import { Play, ArrowRight } from 'lucide-react';
import { evaluateExpression } from '../services/expressionApi.js';

const COMPLEXITY_ROWS = [
  {
    stage: '1. Lexical Tokenization',
    module: 'Tokenizer.java',
    time: 'O(n)',
    space: 'O(t)',
    explanation:
      'Single linear character scan over input length n producing t <= 2,000 tokens with finite-state numeric/identifier grouping.',
  },
  {
    stage: '2. Infix-to-Postfix Conversion',
    module: 'ExpressionParser.java',
    time: 'O(t)',
    space: 'O(t)',
    explanation:
      'Dijkstra Shunting Yard pushes and pops each operator at most once onto the LIFO operator stack.',
  },
  {
    stage: '3. Expression-Tree Construction',
    module: 'ExpressionTreeBuilder.java',
    time: 'O(t)',
    space: 'O(t)',
    explanation:
      'Single pass over postfix tokens using a node stack; each token allocates one ExpressionNode.',
  },
  {
    stage: '4. Postfix Stack Evaluation',
    module: 'ExpressionEvaluator.java',
    time: 'O(t)',
    space: 'O(h)',
    explanation:
      'Post-order traversal with a manual Double stack; stack depth is bounded by tree height h <= t and HashMap variable lookup is O(1) average.',
  },
];

const CONCEPTS = [
  {
    id: 'infix',
    title: '01. Infix Notation',
    summary:
      'Standard human-readable algebraic notation where binary operators sit between operands (e.g., 10 + 5 * 2). Infix notation is ambiguous without precedence rules and parentheses.',
    exampleExpr: '10+5*2',
    exampleVars: {},
    highlight: 'Operators sit between operands; precedence dictates * binds tighter than +.',
  },
  {
    id: 'postfix',
    title: '02. Postfix (Reverse Polish) Notation',
    summary:
      'Operators immediately follow their operands (10 5 2 * +). Postfix removes the need for parentheses and precedence rules during evaluation.',
    exampleExpr: '(10+5)*2',
    exampleVars: {},
    highlight: 'Parentheses disappear completely; evaluation becomes a single left-to-right stack pass.',
  },
  {
    id: 'stack',
    title: '03. Stack Operations (LIFO)',
    summary:
      'A Last-In, First-Out linear structure supporting push, pop, and peek in O(1) time. Used in Shunting Yard (operator stack), Tree construction (node stack), and Postfix evaluation (operand stack).',
    exampleExpr: '5*-2',
    exampleVars: {},
    highlight: 'Every operator is pushed onto the stack and popped when an operator of lower/equal precedence arrives.',
  },
  {
    id: 'shunting-yard',
    title: '04. Shunting Yard Algorithm',
    summary:
      'Edsger Dijkstra’s linear-time O(n) algorithm that converts infix tokens to postfix using an operator stack while preserving order of operands.',
    exampleExpr: '-(a+b)*2+30/5',
    exampleVars: { a: 10, b: 5 },
    highlight: 'Left parentheses act as temporary barriers on the stack until the matching right parenthesis pops them.',
  },
  {
    id: 'precedence',
    title: '05. Operator Precedence & Associativity',
    summary:
      'Unary minus (NEG) has highest precedence (3) and is right-associative (allowing --5). Multiplication/division have precedence (2, left-associative). Addition/subtraction have precedence (1, left-associative).',
    exampleExpr: '--5+10/2*3',
    exampleVars: {},
    highlight: 'Right-associativity means NEG does not pop an existing NEG on top of the stack.',
  },
  {
    id: 'trees',
    title: '06. Binary Expression Trees',
    summary:
      'A hierarchical syntax tree where internal nodes hold operators and leaf nodes hold numeric constants or variable symbols. Unary operators hold one left child.',
    exampleExpr: '-(a+b)',
    exampleVars: { a: 10, b: 5 },
    highlight: 'Built in O(n) from postfix tokens using a Stack<ExpressionNode>.',
  },
  {
    id: 'traversal',
    title: '07. Tree Traversals (Pre, In, Post)',
    summary:
      'Preorder (Root-Left-Right) yields Prefix notation; Inorder (Left-Root-Right) reconstructs parenthesized Infix; Postorder (Left-Right-Root) yields Postfix evaluation order.',
    exampleExpr: '(a+b)*(c-(3+2))',
    exampleVars: { a: -8, b: 4, c: 2 },
    highlight: 'Postorder traversal visits children before the parent operator, guaranteeing operands are ready.',
  },
  {
    id: 'evaluation',
    title: '08. Postfix Stack Evaluation',
    summary:
      'ExpressionEvaluator.java walks post-order nodes with a manual Stack<Double>: operands push values, binary operators pop right then left, and unary NEG pops one operand.',
    exampleExpr: '-(a+b)*2+30/5',
    exampleVars: { a: 10, b: 5 },
    highlight: 'Division by zero is verified immediately before performing the real-valued division.',
  },
  {
    id: 'hashmap',
    title: '09. HashMap Variable Storage',
    summary:
      'Variables are stored in a Java HashMap<String, Double>, providing average O(1) lookup time when resolving variable leaf nodes during validation and evaluation.',
    exampleExpr: 'velocity*time+offset',
    exampleVars: { velocity: 12.5, time: 4, offset: -10 },
    highlight: 'Missing keys are caught cleanly by ExpressionValidator before tree evaluation begins.',
  },
];

export default function LearningMode({ onLoadIntoWorkspace }) {
  const [selectedConcept, setSelectedConcept] = useState(CONCEPTS[0]);
  const [liveResult, setLiveResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const runConceptExample = async (concept) => {
    setSelectedConcept(concept);
    setIsLoading(true);
    try {
      const res = await evaluateExpression(concept.exampleExpr, concept.exampleVars);
      setLiveResult(res);
    } catch {
      setLiveResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Algorithmic Complexity Analysis */}
      <section className="obs-surface rounded-xl p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Algorithmic Time &amp; Space Complexity</h2>
          <p className="text-sm text-slate-400 mt-1">
            Overall pipeline complexity is strictly linear <span className="font-mono text-cyan-300">O(n)</span> in both time and memory for an expression of <span className="font-mono">n</span> characters and <span className="font-mono">t &le; 2,000</span> tokens.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400">
                <th className="py-3 px-4">Pipeline Stage</th>
                <th className="py-3 px-4 font-mono">Java Class</th>
                <th className="py-3 px-4 font-mono">Time</th>
                <th className="py-3 px-4 font-mono">Space</th>
                <th className="py-3 px-4">Analysis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {COMPLEXITY_ROWS.map((row) => (
                <tr key={row.stage} className="hover:bg-slate-900/40">
                  <td className="py-3 px-4 font-medium text-white whitespace-nowrap">{row.stage}</td>
                  <td className="py-3 px-4 font-mono text-xs text-cyan-300 whitespace-nowrap">{row.module}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-emerald-300 whitespace-nowrap">{row.time}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-purple-300 whitespace-nowrap">{row.space}</td>
                  <td className="py-3 px-4 text-slate-300">{row.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Concept List */}
        <div className="lg:col-span-5 space-y-2.5">
          {CONCEPTS.map((c) => {
            const active = selectedConcept.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => runConceptExample(c)}
                className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                  active
                    ? 'bg-cyan-500/12 border-cyan-500/45'
                    : 'obs-surface hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-semibold ${active ? 'text-cyan-300' : 'text-white'}`}>
                    {c.title}
                  </span>
                  <span className="font-mono text-xs text-slate-400">{c.exampleExpr}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                  {c.summary}
                </p>
              </button>
            );
          })}
        </div>

        {/* Interactive Stage */}
        <div className="lg:col-span-7 obs-surface-elevated rounded-xl p-5 sm:p-6 space-y-5 sticky top-20">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">{selectedConcept.title}</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{selectedConcept.summary}</p>
            <div className="p-3.5 rounded-lg bg-[#060913] border border-cyan-500/25 text-xs text-cyan-200">
              {selectedConcept.highlight}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <div className="font-mono text-sm text-slate-200">
              Example: <span className="text-cyan-300">{selectedConcept.exampleExpr}</span>
              {Object.keys(selectedConcept.exampleVars).length > 0 && (
                <span className="text-xs text-slate-400 ml-2">
                  ({Object.entries(selectedConcept.exampleVars).map(([k, v]) => `${k}=${v}`).join(', ')})
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => runConceptExample(selectedConcept)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isLoading ? 'Running...' : 'Run Live in Java'}</span>
            </button>
          </div>

          {liveResult && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-[#060913] border border-slate-800/80">
                  <div className="text-xs text-slate-400">Stage 1 · Tokens</div>
                  <div className="font-mono text-xs text-slate-200 mt-1 break-words">
                    {liveResult.tokens?.map((t) => (t.type === 'UNARY_OPERATOR' ? 'NEG' : t.value)).join(' | ')}
                  </div>
                </div>
                <div className="p-3.5 rounded-lg bg-[#060913] border border-slate-800/80">
                  <div className="text-xs text-slate-400">Stage 2 · Postfix (RPN)</div>
                  <div className="font-mono text-xs text-cyan-300 mt-1 break-words">
                    {liveResult.postfixExpression}
                  </div>
                </div>
                <div className="p-3.5 rounded-lg bg-[#060913] border border-slate-800/80">
                  <div className="text-xs text-slate-400">Stage 3 · Tree Postorder</div>
                  <div className="font-mono text-xs text-purple-300 mt-1 break-words">
                    {liveResult.postorderTraversal?.join(' ')}
                  </div>
                </div>
                <div className="p-3.5 rounded-lg bg-[#060913] border border-emerald-500/30">
                  <div className="text-xs text-emerald-400">Stage 4 · Final Result</div>
                  <div className="font-mono text-lg font-bold text-white mt-0.5 tabular-nums">
                    {liveResult.formattedResult}
                  </div>
                </div>
              </div>

              {liveResult.intermediateCalculations?.length > 0 && (
                <div className="p-3.5 rounded-lg bg-[#060913] border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1.5">Stack Evaluation Order</div>
                  <div className="space-y-1 font-mono text-xs text-slate-200">
                    {liveResult.intermediateCalculations.map((line, i) => (
                      <div key={i}>
                        {i + 1}. {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => onLoadIntoWorkspace(selectedConcept.exampleExpr, liveResult)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200 cursor-pointer"
              >
                <span>Open full tree &amp; stack trace in Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
