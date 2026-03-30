import { useRef, useCallback, useState, useEffect } from 'react';
import { NODE_W, NODE_H, NODE_STYLES } from '../data/nodeStyles.js';

const CANVAS_W = 2400;
const CANVAS_H = 1600;
const MAP_W    = 190;
const MAP_H    = Math.round(MAP_W * CANVAS_H / CANVAS_W); // 127

export function Minimap({ nodes, wrapperRef, zoom }) {
  const mapRef = useRef(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const scaleX = MAP_W / CANVAS_W;
  const scaleY = MAP_H / CANVAS_H;

  // Update viewport rect on scroll / resize
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setViewport({
      x: el.scrollLeft / zoom,
      y: el.scrollTop  / zoom,
      w: el.clientWidth  / zoom,
      h: el.clientHeight / zoom,
    });
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [wrapperRef, zoom]);

  const handleClick = useCallback((e) => {
    if (!wrapperRef.current || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / scaleX;
    const my = (e.clientY - rect.top)  / scaleY;
    const el = wrapperRef.current;
    el.scrollLeft = mx * zoom - el.clientWidth  / 2;
    el.scrollTop  = my * zoom - el.clientHeight / 2;
  }, [scaleX, scaleY, zoom, wrapperRef]);

  return (
    <div className="minimap" ref={mapRef} onClick={handleClick} title="Click to navigate">
      <svg width={MAP_W} height={MAP_H}>
        {nodes.map(node => {
          const style = NODE_STYLES[node.type] || NODE_STYLES.agent;
          return (
            <rect
              key={node.id}
              x={node.position.x * scaleX}
              y={node.position.y * scaleY}
              width={Math.max(NODE_W * scaleX, 3)}
              height={Math.max(NODE_H * scaleY, 2)}
              fill={style.fill}
              stroke={style.border}
              strokeWidth={0.6}
              rx={1}
            />
          );
        })}
        {/* Viewport rect — clamped so right/bottom edges never exceed SVG bounds */}
        {(() => {
          const rx = Math.max(0, viewport.x * scaleX);
          const ry = Math.max(0, viewport.y * scaleY);
          const rw = Math.max(0, Math.min(MAP_W - rx, viewport.w * scaleX));
          const rh = Math.max(0, Math.min(MAP_H - ry, viewport.h * scaleY));
          return (
            <rect x={rx} y={ry} width={rw} height={rh}
              fill="rgba(255,255,255,0.05)"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth={1}
              rx={1}
            />
          );
        })()}
      </svg>
    </div>
  );
}
