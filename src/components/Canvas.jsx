import { useState, useRef, useCallback, useEffect } from 'react';
import { NODE_W, NODE_H } from '../data/nodeStyles.js';
import { snapToGrid, isNearLine } from '../utils/graph.js';
import { getEdgePoints } from '../utils/geometry.js';
import { EdgeLayer } from './EdgeLayer.jsx';
import { NodeCard } from './NodeCard.jsx';
// Minimap is rendered by App.jsx outside the scroll container for correct sticky behaviour

const CANVAS_W = 2400;
const CANVAS_H = 1600;

const EXAMPLE_PROMPTS = [
  'A research assistant that searches the web, summarises findings, and writes a briefing document',
  'A customer support triage system that reads tickets, classifies urgency, and drafts personalised replies',
  'A competitive intelligence pipeline that monitors competitor activity and generates a weekly digest',
  'A content moderation system that classifies posts, flags harmful content, and routes borderline cases for human review',
  'An investment analysis tool that researches a company, assesses risk factors, and writes a one-page investment brief',
];

export function Canvas({ graph, selectedId, selectedEdgeId, highlightedIds,
                         onSelectNode, onSelectEdge, onUpdatePosition,
                         onAddNode, onAddEdge, portsAlways, nodeRunStates, runMode,
                         zoom, onZoom, selectedIds, onMultiSelect, wrapperRefOut,
                         onExampleClick }) {
  const wrapperRef  = useRef(null);

  // Expose the wrapper element to parent (for Minimap scroll sync)
  const setWrapperRef = useCallback((el) => {
    wrapperRef.current = el;
    if (wrapperRefOut) wrapperRefOut.current = el;
  }, [wrapperRefOut]);
  const dragNodeRef = useRef(null);
  const dragEdgeRef = useRef(null);
  const [draggingEdge, setDraggingEdge] = useState(null);
  const [rubberBand,   setRubberBand]   = useState(null);

  // Scroll canvas to centre (1200, 800) on first mount
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const targetScrollLeft = (CANVAS_W / 2) * zoom - el.clientWidth  / 2;
    const targetScrollTop  = (CANVAS_H / 2) * zoom - el.clientHeight / 2;
    el.scrollLeft = Math.max(0, targetScrollLeft);
    el.scrollTop  = Math.max(0, targetScrollTop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canvasCoords = useCallback((e) => {
    const rect = wrapperRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left + wrapperRef.current.scrollLeft) / zoom,
      y: (e.clientY - rect.top  + wrapperRef.current.scrollTop)  / zoom,
    };
  }, [zoom]);

  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    if (e.shiftKey && onMultiSelect) {
      // Shift-click: toggle node in multi-selection
      const next = new Set(selectedIds || []);
      if (next.has(nodeId)) { next.delete(nodeId); } else { next.add(nodeId); }
      onMultiSelect(next);
      return;
    }
    onSelectNode(nodeId);
    onSelectEdge(null);
    if (onMultiSelect) onMultiSelect(new Set([nodeId]));
    const { x, y } = canvasCoords(e);
    const node = graph.nodes.find(n => n.id === nodeId);
    dragNodeRef.current = { nodeId, offsetX: x - node.position.x, offsetY: y - node.position.y };
  }, [graph.nodes, onSelectNode, onSelectEdge, canvasCoords, selectedIds, onMultiSelect]);

  const handlePortMouseDown = useCallback((e, fromId) => {
    dragEdgeRef.current = { fromId };
    const { x, y } = canvasCoords(e);
    setDraggingEdge({ fromId, x, y });
  }, [canvasCoords]);

  const handleMouseMove = useCallback((e) => {
    const { x, y } = canvasCoords(e);
    if (dragNodeRef.current) {
      const nx = Math.max(0, x - dragNodeRef.current.offsetX);
      const ny = Math.max(0, y - dragNodeRef.current.offsetY);
      const snapped = snapToGrid(nx, ny);
      onUpdatePosition(dragNodeRef.current.nodeId, snapped.x, snapped.y);
    }
    if (dragEdgeRef.current) {
      setDraggingEdge({ fromId: dragEdgeRef.current.fromId, x, y });
    }
    if (rubberBand) {
      setRubberBand(prev => prev ? { ...prev, x2: x, y2: y } : null);
    }
  }, [canvasCoords, onUpdatePosition, rubberBand]);

  const handleMouseUp = useCallback((e) => {
    if (dragEdgeRef.current) {
      const { x, y } = canvasCoords(e);
      const target = graph.nodes.find(n =>
        n.id !== dragEdgeRef.current.fromId &&
        x >= n.position.x && x <= n.position.x + NODE_W &&
        y >= n.position.y && y <= n.position.y + NODE_H
      );
      if (target) onAddEdge(dragEdgeRef.current.fromId, target.id);
      dragEdgeRef.current = null;
      setDraggingEdge(null);
    }
    dragNodeRef.current = null;

    if (rubberBand) {
      const { x1, y1, x2, y2 } = rubberBand;
      const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
      // Only commit if dragged a meaningful distance
      if ((maxX - minX) > 5 || (maxY - minY) > 5) {
        const ids = graph.nodes
          .filter(n =>
            n.position.x + NODE_W > minX && n.position.x < maxX &&
            n.position.y + NODE_H > minY && n.position.y < maxY
          )
          .map(n => n.id);
        if (ids.length > 0 && onMultiSelect) {
          onMultiSelect(new Set(ids));
          onSelectNode(ids.length === 1 ? ids[0] : null);
          onSelectEdge(null);
        }
      }
      setRubberBand(null);
    }
  }, [canvasCoords, graph.nodes, onAddEdge, rubberBand, onMultiSelect, onSelectNode, onSelectEdge]);

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target.closest('.node-card') || e.target.closest('.node-port')) return;
    const { x, y } = canvasCoords(e);
    const nodeMap = Object.fromEntries(graph.nodes.map(n => [n.id, n]));
    let hit = null;
    for (const edge of graph.edges) {
      const from = nodeMap[edge.from], to = nodeMap[edge.to];
      if (!from || !to) continue;
      const { x1, y1, x2, y2 } = getEdgePoints(from, to);
      if (isNearLine(x, y, x1, y1, x2, y2)) { hit = edge.id; break; }
    }
    if (hit) {
      onSelectEdge(hit);
      onSelectNode(null);
      if (onMultiSelect) onMultiSelect(new Set());
    } else {
      onSelectEdge(null);
      onSelectNode(null);
      if (onMultiSelect) onMultiSelect(new Set());
      // Begin rubber-band selection
      setRubberBand({ x1: x, y1: y, x2: x, y2: y });
    }
  }, [canvasCoords, graph.nodes, graph.edges, onSelectEdge, onSelectNode, onMultiSelect]);

  const handleDoubleClick = useCallback((e) => {
    if (e.target.closest('.node-card')) return;
    setRubberBand(null); // cancel any in-progress rubber band from the first click
    const { x, y } = canvasCoords(e);
    const snapped = snapToGrid(x - NODE_W / 2, y - NODE_H / 2);
    onAddNode(snapped.x, snapped.y);
  }, [canvasCoords, onAddNode]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('nodeTemplate');
    if (!raw) return;
    const tpl = JSON.parse(raw);
    const { x, y } = canvasCoords(e);
    const snapped = snapToGrid(x - NODE_W / 2, y - NODE_H / 2);
    onAddNode(snapped.x, snapped.y, tpl);
  }, [canvasCoords, onAddNode]);

  // Ctrl/Cmd + wheel zooms
  const handleWheel = useCallback((e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    if (onZoom) onZoom(prev => Math.min(2, Math.max(0.25, parseFloat((prev + delta).toFixed(2)))));
  }, [onZoom]);

  // Selection indicator: node is selected if in selectedIds, or falls back to selectedId
  const isNodeSelected = useCallback((nodeId) => {
    if (selectedIds && selectedIds.size > 0) return selectedIds.has(nodeId);
    return nodeId === selectedId;
  }, [selectedIds, selectedId]);

  // Rubber band rect in canvas coordinates (inside canvas-inner, scaled by zoom internally)
  const rbStyle = rubberBand ? {
    position: 'absolute',
    left:   Math.min(rubberBand.x1, rubberBand.x2),
    top:    Math.min(rubberBand.y1, rubberBand.y2),
    width:  Math.abs(rubberBand.x2 - rubberBand.x1),
    height: Math.abs(rubberBand.y2 - rubberBand.y1),
  } : null;

  return (
    <div
      ref={setWrapperRef}
      className="canvas-wrapper"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseDown={handleCanvasMouseDown}
      onDoubleClick={handleDoubleClick}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      onWheel={handleWheel}
      style={{ '--canvas-zoom': zoom }}
    >
      {/* Spacer that gives scroll area the zoomed dimensions.
          onDragOver on both layers ensures drop is accepted even when
          CSS transform creates a separate hit-test region in Chromium. */}
      <div
        style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom, position: 'relative', flexShrink: 0 }}
        onDragOver={e => e.preventDefault()}
      >
        <div
          className="canvas-inner"
          style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}
          onDragOver={e => e.preventDefault()}
        >
          <EdgeLayer
            nodes={graph.nodes}
            edges={graph.edges}
            selectedEdgeId={selectedEdgeId}
            draggingEdge={draggingEdge}
            nodeRunStates={nodeRunStates}
          />
          {graph.nodes.map(node => (
            <NodeCard
              key={node.id}
              node={node}
              isSelected={isNodeSelected(node.id)}
              isHighlighted={!!(highlightedIds && highlightedIds.has(node.id))}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onPortMouseDown={handlePortMouseDown}
              portsAlways={portsAlways}
              runStatus={nodeRunStates?.get(node.id) || null}
            />
          ))}
          {graph.nodes.length === 0 && (
            <div className="canvas-placeholder">
              {runMode === 'run' ? (
                <>
                  <h2>Nothing to run</h2>
                  <p>Switch to <strong style={{color:'#252535'}}>Design mode</strong> to build your graph first.</p>
                </>
              ) : (
                <>
                  <div className="placeholder-title">What do you want to build?</div>
                  <div className="placeholder-sub">Open the <strong>⬡ Architect</strong> panel and describe your pipeline — or start with one of these:</div>
                  <div className="placeholder-examples">
                    {EXAMPLE_PROMPTS.map((ex, i) => (
                      <button
                        key={i}
                        className="placeholder-example-btn"
                        onClick={() => onExampleClick && onExampleClick(ex)}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                  <div className="placeholder-hint">Double-click canvas to add a node manually · Drag between ports to connect</div>
                </>
              )}
            </div>
          )}
          {rbStyle && <div className="rubber-band" style={rbStyle} />}
        </div>
      </div>

    </div>
  );
}
