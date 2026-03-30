import { NODE_W, NODE_H } from '../data/nodeStyles.js';

function getBorderPoint(cx, cy, dx, dy) {
  const hw = NODE_W / 2, hh = NODE_H / 2;
  const adx = Math.abs(dx), ady = Math.abs(dy);
  if (adx === 0 && ady === 0) return { x: cx, y: cy };
  const t = ady * hw > adx * hh ? hh / ady : hw / adx;
  return { x: cx + dx * t, y: cy + dy * t };
}

export function getEdgePoints(fromNode, toNode) {
  const fcx = fromNode.position.x + NODE_W / 2, fcy = fromNode.position.y + NODE_H / 2;
  const tcx = toNode.position.x  + NODE_W / 2, tcy = toNode.position.y  + NODE_H / 2;
  const dx = tcx - fcx, dy = tcy - fcy;
  return {
    x1: getBorderPoint(fcx, fcy,  dx,  dy).x,
    y1: getBorderPoint(fcx, fcy,  dx,  dy).y,
    x2: getBorderPoint(tcx, tcy, -dx, -dy).x,
    y2: getBorderPoint(tcx, tcy, -dx, -dy).y,
  };
}
