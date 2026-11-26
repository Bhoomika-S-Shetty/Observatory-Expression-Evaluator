import React, { useEffect, useMemo, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Play,
  Pause,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

function layoutBinaryTree(root, collapsedIds) {
  if (!root) return { nodes: [], edges: [], width: 580, height: 320 };

  const horizontalGap = 96;
  const verticalGap = 104;
  const marginX = 68;
  const marginY = 64;

  let leafCounter = 0;
  let maxDepth = 0;
  const positioned = new Map();

  function assignCoordinates(node, depth) {
    if (!node) return null;
    maxDepth = Math.max(maxDepth, depth);

    const isCollapsed = collapsedIds.has(node.id);
    const hasLeft = !isCollapsed && Boolean(node.left);
    const hasRight = !isCollapsed && Boolean(node.right);
    const hasActualChildren = Boolean(node.left || node.right);

    let x;
    if (!hasLeft && !hasRight) {
      x = leafCounter * horizontalGap;
      leafCounter += 1;
    } else if (hasLeft && !hasRight) {
      const leftPos = assignCoordinates(node.left, depth + 1);
      x = leftPos.x;
    } else if (!hasLeft && hasRight) {
      const rightPos = assignCoordinates(node.right, depth + 1);
      x = rightPos.x;
    } else {
      const leftPos = assignCoordinates(node.left, depth + 1);
      const rightPos = assignCoordinates(node.right, depth + 1);
      x = (leftPos.x + rightPos.x) / 2;
    }

    const pos = {
      id: node.id,
      value: node.value,
      type: node.type,
      evaluatedValue: node.evaluatedValue,
      x,
      y: depth * verticalGap,
      isRoot: depth === 0,
      hasChildren: hasActualChildren,
      isCollapsed,
    };
    positioned.set(node.id, pos);
    return pos;
  }

  assignCoordinates(root, 0);

  const nodes = Array.from(positioned.values());
  let minX = Infinity;
  let maxX = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
  }

  const shiftedNodes = nodes.map((n) => ({
    ...n,
    x: n.x - minX + marginX,
    y: n.y + marginY,
  }));

  const lookup = new Map(shiftedNodes.map((n) => [n.id, n]));
  const edges = [];

  function collectEdges(node) {
    if (!node || collapsedIds.has(node.id)) return;
    const parentPos = lookup.get(node.id);
    if (node.left) {
      const leftPos = lookup.get(node.left.id);
      if (leftPos) {
        edges.push({
          id: `${node.id}-L-${node.left.id}`,
          from: parentPos,
          to: leftPos,
          label: node.type === 'UNARY_OPERATOR' ? 'operand' : 'L',
        });
        collectEdges(node.left);
      }
    }
    if (node.right) {
      const rightPos = lookup.get(node.right.id);
      if (rightPos) {
        edges.push({
          id: `${node.id}-R-${node.right.id}`,
          from: parentPos,
          to: rightPos,
          label: 'R',
        });
        collectEdges(node.right);
      }
    }
  }
  collectEdges(root);

  const width = Math.max(540, maxX - minX + marginX * 2);
  const height = Math.max(300, maxDepth * verticalGap + marginY * 2 + 28);

  return { nodes: shiftedNodes, edges, width, height };
}

function getNodeColors(type) {
  switch (type) {
    case 'UNARY_OPERATOR':
      return {
        fill: '#2e1065',
        stroke: '#a855f7',
        text: '#e9d5ff',
        badge: 'Unary Op',
      };
    case 'OPERATOR':
      return {
        fill: '#082f49',
        stroke: '#22d3ee',
        text: '#cffafe',
        badge: 'Binary Op',
      };
    case 'VARIABLE':
      return {
        fill: '#172554',
        stroke: '#3b82f6',
        text: '#dbeafe',
        badge: 'Variable',
      };
    default:
      return {
        fill: '#0f172a',
        stroke: '#94a3b8',
        text: '#f1f5f9',
        badge: 'Number',
      };
  }
}

export default function ExpressionTreeExplorer({
  evaluation,
  highlightedNodeId = null,
  activeCalculationOrder = null,
  heightClass = 'h-[430px]',
  title = 'C. Expression Tree Explorer',
}) {
  const tree = evaluation?.expressionTree || null;
  const textTree = evaluation?.textTree || '';
  const calculationSteps = evaluation?.calculationSteps || [];
  const preorder = evaluation?.preorderTraversal;
  const inorder = evaluation?.inorderTraversal;
  const postorder = evaluation?.postorderTraversal;
  const variablesUsed = evaluation?.variablesUsed;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'text' | 'split'

  // Standalone Bottom-Up Animation inside Tree Explorer
  const [bottomUpAnimating, setBottomUpAnimating] = useState(false);
  const [bottomUpStep, setBottomUpStep] = useState(null);

  useEffect(() => {
    setCollapsedIds(new Set());
    setSelectedNodeId(null);
    setBottomUpAnimating(false);
    setBottomUpStep(null);
  }, [tree]);

  useEffect(() => {
    if (!bottomUpAnimating || calculationSteps.length === 0) return;
    const timer = setInterval(() => {
      setBottomUpStep((prev) => {
        const next = prev === null ? 0 : prev + 1;
        if (next >= calculationSteps.length) {
          setBottomUpAnimating(false);
          return calculationSteps.length - 1;
        }
        return next;
      });
    }, 850);
    return () => clearInterval(timer);
  }, [bottomUpAnimating, calculationSteps.length]);

  const layout = useMemo(() => layoutBinaryTree(tree, collapsedIds), [tree, collapsedIds]);

  const stepByNodeId = useMemo(() => {
    const map = new Map();
    for (const s of calculationSteps) {
      map.set(s.nodeId, s);
    }
    return map;
  }, [calculationSteps]);

  const activeBottomUpCalc =
    bottomUpStep !== null && calculationSteps[bottomUpStep]
      ? calculationSteps[bottomUpStep]
      : null;

  const effectiveHighlightedId = activeBottomUpCalc?.nodeId || highlightedNodeId;
  const effectiveMaxOrder = activeBottomUpCalc
    ? activeBottomUpCalc.order
    : activeCalculationOrder;

  const effectiveSelectedId = effectiveHighlightedId || selectedNodeId;
  const selectedNode = useMemo(
    () =>
      layout.nodes.find((n) => n.id === effectiveSelectedId) ||
      layout.nodes.find((n) => n.isRoot),
    [layout.nodes, effectiveSelectedId]
  );

  const toggleCollapse = (nodeId) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCollapsedIds(new Set());
    setBottomUpAnimating(false);
    setBottomUpStep(null);
  };

  const toggleBottomUpAnimation = () => {
    if (calculationSteps.length === 0) return;
    if (bottomUpAnimating) {
      setBottomUpAnimating(false);
    } else {
      if (bottomUpStep === null || bottomUpStep >= calculationSteps.length - 1) {
        setBottomUpStep(0);
      }
      setBottomUpAnimating(true);
    }
  };

  if (!tree) {
    return (
      <section className="obs-surface rounded-lg p-5">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="text-xs text-slate-400 mt-2">
          Evaluate an expression to explore the binary expression tree built by{' '}
          <code className="text-cyan-300">ExpressionTreeBuilder.java</code>.
        </p>
      </section>
    );
  }

  return (
    <section className="obs-surface rounded-lg p-4 sm:p-5 space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
              Binary Op
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
              Unary (NEG)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
              Variable
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 inline-block" />
              Number
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {calculationSteps.length > 0 && (
            <button
              type="button"
              onClick={toggleBottomUpAnimation}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 cursor-pointer whitespace-nowrap"
            >
              {bottomUpAnimating ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Eval</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Animate Bottom-Up</span>
                </>
              )}
            </button>
          )}

          {/* View Mode Switcher */}
          <div className="inline-flex items-center p-0.5 rounded bg-[#050811] border border-slate-800">
            {[
              { id: 'visual', label: 'Visual' },
              { id: 'text', label: 'Text Tree' },
              { id: 'split', label: 'Split' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === mode.id
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {viewMode !== 'text' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.45, +(z - 0.15).toFixed(2)))}
                aria-label="Zoom out"
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-xs font-mono text-slate-300 tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.15).toFixed(2)))}
                aria-label="Zoom in"
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {collapsedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setCollapsedIds(new Set())}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 cursor-pointer whitespace-nowrap"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Expand All</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleReset}
                aria-label="Reset tree"
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tree Canvas & Text View */}
      <div
        className={`grid gap-4 ${
          viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
        }`}
      >
        {viewMode !== 'text' && (
          <div
            className={`${
              viewMode === 'split' ? 'lg:col-span-8' : ''
            } relative w-full ${heightClass} rounded bg-[#050811] border border-slate-800/80 overflow-hidden select-none ${
              dragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onMouseDown={(e) => {
              setDragging(true);
              setDragOrigin({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            }}
            onMouseMove={(e) => {
              if (!dragging) return;
              setPan({ x: e.clientX - dragOrigin.x, y: e.clientY - dragOrigin.y });
            }}
            onMouseUp={() => setDragging(false)}
            onMouseLeave={() => setDragging(false)}
          >
            <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="w-full h-full">
              <g
                transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
                style={{ transformOrigin: 'center center' }}
              >
                {/* Edges */}
                {layout.edges.map((edge) => {
                  const midX = (edge.from.x + edge.to.x) / 2;
                  const midY = (edge.from.y + edge.to.y) / 2;
                  const ctrlY = edge.from.y + (edge.to.y - edge.from.y) * 0.5;
                  const isHighlightedEdge =
                    effectiveHighlightedId &&
                    (edge.from.id === effectiveHighlightedId ||
                      edge.to.id === effectiveHighlightedId);

                  return (
                    <g key={edge.id}>
                      <path
                        d={`M ${edge.from.x} ${edge.from.y} C ${edge.from.x} ${ctrlY}, ${edge.to.x} ${ctrlY}, ${edge.to.x} ${edge.to.y}`}
                        fill="none"
                        stroke={
                          isHighlightedEdge
                            ? 'rgba(245, 158, 11, 0.9)'
                            : 'rgba(56, 189, 248, 0.35)'
                        }
                        strokeWidth={isHighlightedEdge ? '2.5' : '1.75'}
                      />
                      <text
                        x={midX}
                        y={midY - 4}
                        textAnchor="middle"
                        className="fill-slate-500 text-[10px] font-mono"
                      >
                        {edge.label}
                      </text>
                    </g>
                  );
                })}

                {/* Nodes */}
                {layout.nodes.map((node) => {
                  const colors = getNodeColors(node.type);
                  const isOperator =
                    node.type === 'OPERATOR' || node.type === 'UNARY_OPERATOR';
                  const isHighlighted = effectiveHighlightedId === node.id;
                  const isSelected = selectedNode?.id === node.id;
                  const nodeStep = stepByNodeId.get(node.id);
                  const isEvaluatedYet =
                    effectiveMaxOrder === null ||
                    effectiveMaxOrder === undefined ||
                    !nodeStep ||
                    nodeStep.order <= effectiveMaxOrder;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                      }}
                      className="cursor-pointer"
                    >
                      {isHighlighted && (
                        <circle
                          r={isOperator ? 33 : 35}
                          fill="rgba(245, 158, 11, 0.16)"
                          stroke="#f59e0b"
                          strokeWidth="2.5"
                        />
                      )}

                      {node.isRoot && !isHighlighted && (
                        <>
                          <circle
                            r={isOperator ? 30 : 31}
                            fill="none"
                            stroke="#22d3ee"
                            strokeOpacity="0.4"
                            strokeDasharray="4 3"
                            strokeWidth="1.5"
                          />
                          <text
                            y={-36}
                            textAnchor="middle"
                            className="fill-cyan-300 text-[10px] font-mono font-semibold tracking-wider"
                          >
                            ROOT
                          </text>
                        </>
                      )}

                      {isOperator ? (
                        <circle
                          r={23}
                          fill={colors.fill}
                          stroke={
                            isHighlighted
                              ? '#fbbf24'
                              : isSelected
                                ? '#f8fafc'
                                : colors.stroke
                          }
                          strokeWidth={isHighlighted || isSelected ? 2.5 : 1.75}
                        />
                      ) : (
                        <rect
                          x={-28}
                          y={-19}
                          width={56}
                          height={38}
                          rx={8}
                          fill={colors.fill}
                          stroke={
                            isHighlighted
                              ? '#fbbf24'
                              : isSelected
                                ? '#f8fafc'
                                : colors.stroke
                          }
                          strokeWidth={isHighlighted || isSelected ? 2.5 : 1.75}
                        />
                      )}

                      <text
                        dy="0.35em"
                        textAnchor="middle"
                        fill={colors.text}
                        className="font-mono font-semibold text-[13px]"
                      >
                        {node.value.length > 7
                          ? `${node.value.slice(0, 6)}…`
                          : node.value}
                      </text>

                      {/* Evaluated Subexpression Value Badge */}
                      {isEvaluatedYet &&
                        node.evaluatedValue !== undefined &&
                        node.evaluatedValue !== null &&
                        (isOperator || node.type === 'VARIABLE') && (
                          <g transform="translate(0, 32)">
                            <rect
                              x={-27}
                              y={-9}
                              width={54}
                              height={17}
                              rx={4}
                              fill="#0a0f1d"
                              stroke={isHighlighted ? '#f59e0b' : '#334155'}
                              strokeWidth="1"
                            />
                            <text
                              dy="0.32em"
                              textAnchor="middle"
                              className={`font-mono text-[10px] font-semibold ${
                                isHighlighted ? 'fill-amber-300' : 'fill-emerald-300'
                              }`}
                            >
                              =
                              {node.evaluatedValue.length > 6
                                ? `${node.evaluatedValue.slice(0, 5)}…`
                                : node.evaluatedValue}
                            </text>
                          </g>
                        )}

                      {/* Expand / Collapse Subtree Button */}
                      {node.hasChildren && (
                        <g
                          transform="translate(22, -20)"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCollapse(node.id);
                          }}
                          className="cursor-pointer"
                        >
                          <circle
                            r={9}
                            fill="#0f172a"
                            stroke={node.isCollapsed ? '#22d3ee' : '#475569'}
                            strokeWidth="1.2"
                          />
                          <text
                            dy="0.33em"
                            textAnchor="middle"
                            className="fill-slate-200 font-mono text-[11px] font-bold"
                          >
                            {node.isCollapsed ? '+' : '−'}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Bottom Inspector Overlay */}
            {selectedNode && (
              <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:min-w-[280px] px-3.5 py-2.5 rounded bg-[#0a0f1d]/95 border border-slate-700/80 text-xs flex items-center justify-between gap-4">
                <div>
                  <div className="text-slate-400">
                    {selectedNode.isRoot ? 'Root' : 'Node'} ·{' '}
                    {getNodeColors(selectedNode.type).badge}
                    {selectedNode.isCollapsed && ' (Collapsed)'}
                  </div>
                  <div className="font-mono text-sm font-semibold text-white mt-0.5 flex items-center gap-2">
                    <span>{selectedNode.value}</span>
                    {selectedNode.evaluatedValue !== undefined &&
                      selectedNode.evaluatedValue !== null && (
                        <span className="text-emerald-300">
                          = {selectedNode.evaluatedValue}
                        </span>
                      )}
                    {selectedNode.hasChildren && (
                      <button
                        type="button"
                        onClick={() => toggleCollapse(selectedNode.id)}
                        className="inline-flex items-center gap-0.5 text-[11px] font-sans font-medium text-cyan-300 hover:text-cyan-200 ml-1 cursor-pointer"
                      >
                        {selectedNode.isCollapsed ? (
                          <>
                            <ChevronRight className="w-3.5 h-3.5" />
                            <span>Expand</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Collapse</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {stepByNodeId.has(selectedNode.id) && (
                  <div className="text-right font-mono">
                    <div className="text-slate-400">
                      Eval #{stepByNodeId.get(selectedNode.id).order}
                    </div>
                    <div className="text-emerald-300 font-semibold">
                      {stepByNodeId.get(selectedNode.id).expression} ={' '}
                      {stepByNodeId.get(selectedNode.id).result}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {viewMode !== 'visual' && (
          <div
            className={`${
              viewMode === 'split' ? 'lg:col-span-4' : ''
            } p-4 rounded bg-[#050811] border border-slate-800/80 overflow-auto ${heightClass}`}
          >
            <div className="text-xs font-medium text-slate-400 mb-3">
              Text-Based Expression Tree
            </div>
            <pre className="font-mono text-xs sm:text-sm text-cyan-200 leading-relaxed whitespace-pre">
              {textTree || 'Text tree unavailable.'}
            </pre>
          </div>
        )}
      </div>

      {/* Traversals */}
      {(preorder || inorder || postorder) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="p-3 rounded bg-[#050811] border border-slate-800/80">
            <div className="text-[11px] text-slate-400 mb-1">Preorder (Prefix)</div>
            <div className="font-mono text-xs text-slate-200 break-words">
              {preorder?.join(' ')}
            </div>
          </div>
          <div className="p-3 rounded bg-[#050811] border border-slate-800/80">
            <div className="text-[11px] text-slate-400 mb-1">Inorder (Parenthesized)</div>
            <div className="font-mono text-xs text-slate-200 break-words">
              {inorder?.join(' ')}
            </div>
          </div>
          <div className="p-3 rounded bg-[#050811] border border-slate-800/80">
            <div className="text-[11px] text-slate-400 mb-1">Postorder (Postfix)</div>
            <div className="font-mono text-xs text-cyan-300 break-words">
              {postorder?.join(' ')}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
