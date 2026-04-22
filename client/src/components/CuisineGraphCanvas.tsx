import { useRef, useEffect, useState, useCallback } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { scaleOrdinal } from "d3-scale";

const tableau10 = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
];

interface GraphNode extends SimulationNodeDatum {
  id: string;
  nameRu: string;
  familyRu: string | null;
  linkCount: number;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  strength: number;
  category: string | null;
  note: string | null;
}

interface CuisineGraphCanvasProps {
  nodes: Array<{ id: string; nameRu: string; familyRu: string | null }>;
  links: Array<{ source: string; target: string; strength: number; category: string | null; note: string | null }>;
  activeId?: string | null;
  onNodeClick?: (id: string) => void;
}

const familyColor = scaleOrdinal<string>(tableau10);

function getNodeRadius(linkCount: number): number {
  return Math.min(14, Math.max(6, 6 + linkCount * 0.6));
}

const categoryColors: Record<string, string> = {
  "классика": "rgba(89, 161, 79, 0.5)",
  "современный": "rgba(78, 121, 167, 0.5)",
  "авангард": "rgba(225, 87, 89, 0.5)",
};

interface Transform {
  x: number;
  y: number;
  k: number;
}

export function CuisineGraphCanvas({ nodes, links, activeId, onNodeClick }: CuisineGraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  const dragNodeRef = useRef<GraphNode | null>(null);
  const rafRef = useRef<number>(0);

  const transformRef = useRef<Transform>({ x: 0, y: 0, k: 1 });
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panStartTransformRef = useRef({ x: 0, y: 0 });
  const didPanRef = useRef(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const linkCountMap = new Map<string, number>();
    for (const l of links) {
      linkCountMap.set(l.source, (linkCountMap.get(l.source) || 0) + 1);
      linkCountMap.set(l.target, (linkCountMap.get(l.target) || 0) + 1);
    }

    const graphNodes: GraphNode[] = nodes.map((n) => ({
      id: n.id,
      nameRu: n.nameRu,
      familyRu: n.familyRu,
      linkCount: linkCountMap.get(n.id) || 0,
    }));

    const graphLinks: GraphLink[] = links.map((l) => ({
      source: l.source,
      target: l.target,
      strength: l.strength,
      category: l.category,
      note: l.note,
    }));

    nodesRef.current = graphNodes;
    linksRef.current = graphLinks;

    if (simRef.current) {
      simRef.current.stop();
    }

    const sim = forceSimulation<GraphNode>(graphNodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(graphLinks)
          .id((d) => d.id)
          .distance((d) => 60 + (1 - d.strength) * 60)
          .strength(0.4)
      )
      .force("charge", forceManyBody().strength(-100))
      .force("center", forceCenter(size.width / 2, size.height / 2))
      .force("collide", forceCollide<GraphNode>().radius((d) => getNodeRadius(d.linkCount) + 4))
      .force("x", forceX(size.width / 2).strength(0.04))
      .force("y", forceY(size.height / 2).strength(0.04))
      .alphaDecay(0.02)
      .alphaMin(0.001);

    simRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [nodes, links, size.width, size.height]);

  const screenToWorld = useCallback((sx: number, sy: number): { x: number; y: number } => {
    const t = transformRef.current;
    return {
      x: (sx - t.x) / t.k,
      y: (sy - t.y) / t.k,
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size.width, size.height);

    const t = transformRef.current;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(t.k, t.k);

    const currentLinks = linksRef.current;
    const currentNodes = nodesRef.current;

    for (const link of currentLinks) {
      const source = link.source as GraphNode;
      const target = link.target as GraphNode;
      if (source.x == null || source.y == null || target.x == null || target.y == null) continue;

      const thickness = Math.min(4, 0.8 + link.strength * 3);
      const isActiveLink =
        activeId && (source.id === activeId || target.id === activeId);

      const catColor = link.category ? categoryColors[link.category] : undefined;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = isActiveLink
        ? isDark
          ? "rgba(100, 200, 255, 0.6)"
          : "rgba(0, 120, 200, 0.5)"
        : catColor
          ? catColor
          : isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)";
      ctx.lineWidth = (isActiveLink ? thickness + 1.5 : thickness) / t.k;
      ctx.stroke();
    }

    for (const node of currentNodes) {
      if (node.x == null || node.y == null) continue;

      const isActive = node.id === activeId;
      const isHovered = hoveredNode?.id === node.id;
      const r = getNodeRadius(node.linkCount);
      const drawR = isActive ? r + 4 : isHovered ? r + 2 : r;
      const color = familyColor(node.familyRu || "unknown");

      ctx.beginPath();
      ctx.arc(node.x, node.y, drawR, 0, Math.PI * 2);

      if (isActive) {
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = isDark ? "#fff" : "#000";
        ctx.lineWidth = 2.5 / t.k;
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.globalAlpha = isHovered ? 1 : 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;

        if (isHovered) {
          ctx.strokeStyle = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.3)";
          ctx.lineWidth = 1.5 / t.k;
          ctx.stroke();
        }
      }

      if (t.k > 0.8 || (isActive || isHovered)) {
        const fontSize = Math.max(9, 11 / t.k);
        ctx.font = `500 ${fontSize}px var(--font-sans), sans-serif`;
        ctx.fillStyle = isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.75)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(node.nameRu, node.x, node.y + drawR + 3);
      }
    }

    ctx.restore();

    if (hoveredNode && hoveredNode.x != null && hoveredNode.y != null) {
      const label = hoveredNode.nameRu;
      const familyLabel = hoveredNode.familyRu || "";
      const connections = hoveredNode.linkCount;
      ctx.font = "600 13px var(--font-sans), sans-serif";
      const nameMetrics = ctx.measureText(label);
      const px = 8;
      const py = 5;
      const tx = mousePos.x + 14;
      const ty = mousePos.y - 14;

      let boxWidth = nameMetrics.width;
      let boxHeight = nameMetrics.actualBoundingBoxAscent + nameMetrics.actualBoundingBoxDescent;

      const subtextLines: string[] = [];
      if (familyLabel) subtextLines.push(familyLabel);
      subtextLines.push(`${connections} ${connections === 1 ? 'связь' : connections < 5 ? 'связи' : 'связей'}`);

      for (const line of subtextLines) {
        ctx.font = "400 11px var(--font-sans), sans-serif";
        const lineM = ctx.measureText(line);
        boxWidth = Math.max(boxWidth, lineM.width);
        boxHeight += 15;
      }

      ctx.fillStyle = isDark ? "rgba(30, 30, 40, 0.92)" : "rgba(255, 255, 255, 0.95)";
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(
        tx - px,
        ty - nameMetrics.actualBoundingBoxAscent - py,
        boxWidth + px * 2,
        boxHeight + py * 2,
        6
      );
      ctx.fill();
      ctx.stroke();

      ctx.font = "600 13px var(--font-sans), sans-serif";
      ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.95)" : "rgba(0, 0, 0, 0.85)";
      ctx.fillText(label, tx, ty);

      let yOff = 15;
      for (const line of subtextLines) {
        ctx.font = "400 11px var(--font-sans), sans-serif";
        ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.45)";
        ctx.fillText(line, tx, ty + yOff);
        yOff += 15;
      }
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [size, activeId, hoveredNode, mousePos, isDark]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const findNodeAt = useCallback(
    (wx: number, wy: number): GraphNode | null => {
      const currentNodes = nodesRef.current;
      for (let i = currentNodes.length - 1; i >= 0; i--) {
        const node = currentNodes[i];
        if (node.x == null || node.y == null) continue;
        const r = getNodeRadius(node.linkCount) + 4;
        const dx = wx - node.x;
        const dy = wy - node.y;
        if (dx * dx + dy * dy < r * r) return node;
      }
      return null;
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      setMousePos({ x: sx, y: sy });

      if (dragNodeRef.current) {
        const w = screenToWorld(sx, sy);
        dragNodeRef.current.fx = w.x;
        dragNodeRef.current.fy = w.y;
        simRef.current?.alpha(0.3).restart();
        return;
      }

      if (isPanningRef.current) {
        const dx = sx - panStartRef.current.x;
        const dy = sy - panStartRef.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          didPanRef.current = true;
        }
        const newT: Transform = {
          x: panStartTransformRef.current.x + dx,
          y: panStartTransformRef.current.y + dy,
          k: transformRef.current.k,
        };
        transformRef.current = newT;
        setTransform(newT);
        return;
      }

      const w = screenToWorld(sx, sy);
      const node = findNodeAt(w.x, w.y);
      setHoveredNode(node);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = node ? "pointer" : "grab";
      }
    },
    [findNodeAt, screenToWorld]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const w = screenToWorld(sx, sy);
      const node = findNodeAt(w.x, w.y);

      didPanRef.current = false;

      if (node) {
        dragNodeRef.current = node;
        node.fx = w.x;
        node.fy = w.y;
        simRef.current?.alphaTarget(0.3).restart();
        if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      } else {
        isPanningRef.current = true;
        panStartRef.current = { x: sx, y: sy };
        panStartTransformRef.current = { x: transformRef.current.x, y: transformRef.current.y };
        if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      }
    },
    [findNodeAt, screenToWorld]
  );

  const handleMouseUp = useCallback(() => {
    if (dragNodeRef.current) {
      const node = dragNodeRef.current;
      dragNodeRef.current = null;
      node.fx = null;
      node.fy = null;
      simRef.current?.alphaTarget(0);
    }
    isPanningRef.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (didPanRef.current) return;
      if (!onNodeClick) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const w = screenToWorld(sx, sy);
      const node = findNodeAt(w.x, w.y);
      if (node) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick, findNodeAt, screenToWorld]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
    if (dragNodeRef.current) {
      dragNodeRef.current.fx = null;
      dragNodeRef.current.fy = null;
      dragNodeRef.current = null;
      simRef.current?.alphaTarget(0);
    }
    isPanningRef.current = false;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const scaleBy = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const oldK = transformRef.current.k;
      const newK = Math.min(8, Math.max(0.15, oldK * scaleBy));

      const newT: Transform = {
        x: sx - (sx - transformRef.current.x) * (newK / oldK),
        y: sy - (sy - transformRef.current.y) * (newK / oldK),
        k: newK,
      };
      transformRef.current = newT;
      setTransform(newT);
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      data-testid="cuisine-graph-container"
    >
      <canvas
        ref={canvasRef}
        style={{ width: size.width, height: size.height, cursor: "grab" }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        data-testid="cuisine-graph-canvas"
      />
      <div
        className="absolute bottom-3 right-3 flex gap-1 z-10"
        data-testid="cuisine-zoom-controls"
      >
        <button
          onClick={() => {
            const oldK = transformRef.current.k;
            const newK = Math.min(8, oldK * 1.3);
            const cx = size.width / 2;
            const cy = size.height / 2;
            const newT: Transform = {
              x: cx - (cx - transformRef.current.x) * (newK / oldK),
              y: cy - (cy - transformRef.current.y) * (newK / oldK),
              k: newK,
            };
            transformRef.current = newT;
            setTransform(newT);
          }}
          className="w-8 h-8 rounded-md bg-background/80 border border-border/50 flex items-center justify-center text-sm font-medium hover-elevate"
          data-testid="button-cuisine-zoom-in"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => {
            const oldK = transformRef.current.k;
            const newK = Math.max(0.15, oldK / 1.3);
            const cx = size.width / 2;
            const cy = size.height / 2;
            const newT: Transform = {
              x: cx - (cx - transformRef.current.x) * (newK / oldK),
              y: cy - (cy - transformRef.current.y) * (newK / oldK),
              k: newK,
            };
            transformRef.current = newT;
            setTransform(newT);
          }}
          className="w-8 h-8 rounded-md bg-background/80 border border-border/50 flex items-center justify-center text-sm font-medium hover-elevate"
          data-testid="button-cuisine-zoom-out"
          title="Zoom out"
        >
          -
        </button>
        <button
          onClick={() => {
            const newT: Transform = { x: 0, y: 0, k: 1 };
            transformRef.current = newT;
            setTransform(newT);
          }}
          className="w-8 h-8 rounded-md bg-background/80 border border-border/50 flex items-center justify-center text-xs hover-elevate"
          data-testid="button-cuisine-zoom-reset"
          title="Reset view"
        >
          1:1
        </button>
      </div>
      {transform.k !== 1 && (
        <div
          className="absolute bottom-3 left-3 text-xs text-muted-foreground bg-background/70 rounded px-1.5 py-0.5"
          data-testid="text-cuisine-zoom-level"
        >
          {Math.round(transform.k * 100)}%
        </div>
      )}
    </div>
  );
}
