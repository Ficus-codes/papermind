import React, { useEffect, useRef, useState, useMemo } from 'react';

/**
 * WireframeMesh
 * Renders the glowing amber wireframe node-mesh sculpture inside a thin circular ring,
 * matching the Stitch PAPERMIND architectural design aesthetic.
 * 
 * Upgrades:
 * - Plots important paper keywords at each 3D node with depth cueing and connector hairlines.
 * - Smooth, uniform time-delta based rotation (frame-rate independent).
 * - Smooth damped mouse interaction using exponential lerping (inertia / spring damping).
 * - Interactive node hover states with glowing halos and tooltips.
 */
const WireframeMesh = ({
  caption = '',
  showRing = true,
  showScrollIcon = false,
  showShare = false,
  interactive = true,
  height = '100%',
  broken = false, // for 404/error state
  keywords = [], // Paper keywords to plot at each node
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredKeyword, setHoveredKeyword] = useState(null);

  // Default high-value academic keyphrases if none are provided
  const defaultKeywords = useMemo(() => [
    'ATTENTION',
    'TRANSFORMER',
    'LATENT SPACE',
    'EMBEDDINGS',
    'REPRESENTATION',
    'CONVERGENCE',
    'TOPOLOGY',
    'INFERENCE',
    'LOSS LANDSCAPE',
    'GENERALIZATION',
    'SPARSITY',
    'RESIDUALS',
    'FEEDFORWARD',
    'NORMALIZATION',
    'ENCODER',
    'DECODER',
    'CROSS-ATTENTION',
    'CORPUS',
  ], []);

  // Sanitize and prepare keywords for nodes
  const activeKeywords = useMemo(() => {
    const list = (Array.isArray(keywords) ? keywords : [])
      .map((k) => (typeof k === 'string' ? k.trim() : (k?.term || '').trim()))
      .filter(Boolean);

    const source = list.length > 0 ? list : defaultKeywords;
    return source.map((k) => {
      const clean = k.replace(/^[#\[\]\s]+|[#\[\]\s]+$/g, '').toUpperCase();
      return clean.length > 18 ? clean.substring(0, 16) + '…' : clean;
    });
  }, [keywords, defaultKeywords]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let lastTime = performance.now();

    // Constant uniform base angular speeds (radians/second)
    const BASE_SPEED_Y = 0.28;
    const BASE_SPEED_X = 0.12;

    let baseAngleY = 0.5;
    let baseAngleX = 0.35;

    // Smooth cursor steering targets and smoothed current values
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

    // Track mouse position on canvas for hover detection
    let mouseCanvasX = -9999;
    let mouseCanvasY = -9999;
    let isHoveringContainer = false;

    // Golden ratio for icosahedron vertices (12 outer vertices)
    const phi = (1 + Math.sqrt(5)) / 2;
    let baseVertices = [
      [-1,  phi, 0], [ 1,  phi, 0], [-1, -phi, 0], [ 1, -phi, 0],
      [0, -1,  phi], [0,  1,  phi], [0, -1, -phi], [0,  1, -phi],
      [ phi, 0, -1], [ phi, 0,  1], [-phi, 0, -1], [-phi, 0,  1],
      // 6 inner core octahedron vertices
      [0, 0, 1.25], [0, 0, -1.25], [1.25, 0, 0], [-1.25, 0, 0], [0, 1.25, 0], [0, -1.25, 0]
    ];

    if (broken) {
      baseVertices = baseVertices.map(([x, y, z], i) => (i % 3 === 0 ? [x * 2.2, y * 1.8, z * 2] : [x, y, z]));
    }

    // Map active keywords to each vertex
    const vertexKeywords = baseVertices.map((_, idx) => {
      if (activeKeywords.length === 0) return null;
      return activeKeywords[idx % activeKeywords.length];
    });

    const resize = () => {
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = (rect.height || 400) * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    // Mouse handlers on container for smooth, uniform interaction
    const onMouseMove = (e) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5
      
      targetTiltY = nx * 0.9;
      targetTiltX = ny * 0.7;

      mouseCanvasX = e.clientX - rect.left;
      mouseCanvasY = e.clientY - rect.top;
      isHoveringContainer = true;
    };

    const onMouseEnter = () => {
      isHoveringContainer = true;
    };

    const onMouseLeave = () => {
      targetTiltX = 0;
      targetTiltY = 0;
      mouseCanvasX = -9999;
      mouseCanvasY = -9999;
      isHoveringContainer = false;
      setHoveredKeyword(null);
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseenter', onMouseEnter);
    container.addEventListener('mouseleave', onMouseLeave);

    const render = (now) => {
      // Calculate delta time in seconds, clamped to avoid jumps during tab switches
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const width = canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
      const height = canvas.height / (Math.min(window.devicePixelRatio || 1, 2));
      const cx = width / 2;
      const cy = height / 2;
      // Slightly more compact scale to leave ample margin for outward-plotted keyword labels
      const scale = Math.min(width, height) * 0.20;

      ctx.clearRect(0, 0, width, height);

      // 1. Perfectly uniform base orbital rotation
      baseAngleY += BASE_SPEED_Y * dt;
      baseAngleX += BASE_SPEED_X * dt;

      // 2. Smooth exponential damping for cursor steering (fluid inertia)
      const dampFactor = 1 - Math.exp(-dt * 5.0);
      currentTiltX += (targetTiltX - currentTiltX) * dampFactor;
      currentTiltY += (targetTiltY - currentTiltY) * dampFactor;

      const angleX = baseAngleX + currentTiltX;
      const angleY = baseAngleY + currentTiltY;

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      // 3. Project 3D vertices to 2D screen space
      const projected = baseVertices.map(([x, y, z], idx) => {
        // Rotate around Y
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        // Rotate around X
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        const distance = 4.4;
        const perspective = distance / (distance - z2);
        return {
          idx,
          x: cx + x1 * scale * perspective,
          y: cy + y2 * scale * perspective,
          z: z2,
          perspective,
          keyword: vertexKeywords[idx],
        };
      });

      // 4. Draw connecting edges
      ctx.lineWidth = 1;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < scale * 1.55) {
            const alpha = Math.max(0.06, 0.42 - dist / (scale * 1.55));
            ctx.strokeStyle = broken && (i % 2 === 0)
              ? `rgba(192, 57, 43, ${alpha * 0.7})`
              : `rgba(255, 255, 255, ${alpha * 0.38})`;
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.stroke();
          }
        }
      }

      // 5. Draw Thin Outer Architectural Ring
      if (showRing) {
        const ringRadius = scale * 1.95;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Subtle amber highlight tracking rotation
        ctx.strokeStyle = 'rgba(255, 154, 46, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, angleY, angleY + Math.PI * 0.32);
        ctx.stroke();
      }

      // Check hover on nodes
      let foundHoveredNode = null;
      if (isHoveringContainer) {
        for (let i = 0; i < projected.length; i++) {
          const p = projected[i];
          const distToMouse = Math.hypot(p.x - mouseCanvasX, p.y - mouseCanvasY);
          if (distToMouse < 24) {
            foundHoveredNode = p;
            break;
          }
        }
      }

      // 6. Draw Glowing Amber Nodes (depth-sorted)
      const sortedByDepth = [...projected].sort((a, b) => a.z - b.z);

      sortedByDepth.forEach((p) => {
        const isHovered = foundHoveredNode && foundHoveredNode.idx === p.idx;
        const radius = Math.max(2.4, (isHovered ? 4.8 : 3.4) * p.perspective);
        const depthAlpha = Math.max(0.3, Math.min(1.0, 0.45 + (p.z + 1.8) / 3.6));

        // Vertex glow aura
        const glowRadius = radius * (isHovered ? 4.5 : 3.0);
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
        glow.addColorStop(0, isHovered ? 'rgba(255, 154, 46, 0.95)' : `rgba(255, 154, 46, ${0.85 * depthAlpha})`);
        glow.addColorStop(0.5, `rgba(255, 193, 94, ${0.30 * depthAlpha})`);
        glow.addColorStop(1, 'rgba(255, 154, 46, 0)');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Vertex center
        ctx.fillStyle = broken && (p.idx % 2 === 0)
          ? '#C0392B'
          : isHovered ? '#FFFFFF' : '#FF9A2E';
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 7. Draw Plotted Keywords at Each Node
      // Render labels with outward radial projection, capsule badge, and connector tick
      ctx.save();
      sortedByDepth.forEach((p) => {
        if (!p.keyword) return;

        const isHovered = foundHoveredNode && foundHoveredNode.idx === p.idx;
        const depthNorm = Math.max(0.2, Math.min(1.0, (p.z + 2.0) / 4.0));
        const alpha = isHovered ? 1.0 : Math.max(0.35, depthNorm);

        // Calculate outward radial angle from center
        const radAngle = Math.atan2(p.y - cy, p.x - cx);
        const nodeRadius = Math.max(2.4, 3.4 * p.perspective);
        const tickDist = 9;

        // Measure keyword text
        ctx.font = isHovered
          ? 'bold 9px "JetBrains Mono", monospace'
          : '8.5px "JetBrains Mono", monospace';
        const metrics = ctx.measureText(p.keyword);
        const textW = metrics.width;
        const padX = 5;
        const badgeH = 15;
        const badgeW = textW + padX * 2;

        // Radial badge position offset
        const totalDist = nodeRadius + tickDist + badgeW / 2;
        const badgeCenterX = p.x + Math.cos(radAngle) * totalDist;
        const badgeCenterY = p.y + Math.sin(radAngle) * totalDist;

        // Keep within canvas bounds
        const clampedX = Math.max(badgeW / 2 + 6, Math.min(width - badgeW / 2 - 6, badgeCenterX));
        const clampedY = Math.max(badgeH / 2 + 6, Math.min(height - badgeH / 2 - 6, badgeCenterY));

        const badgeLeft = clampedX - badgeW / 2;
        const badgeTop = clampedY - badgeH / 2;

        // Hairline connector from node dot to badge
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(
          clampedX - Math.cos(radAngle) * (badgeW / 2),
          clampedY - Math.sin(radAngle) * (badgeH / 2)
        );
        ctx.strokeStyle = isHovered
          ? 'rgba(255, 154, 46, 0.9)'
          : `rgba(255, 154, 46, ${0.45 * alpha})`;
        ctx.lineWidth = isHovered ? 1.2 : 0.8;
        ctx.stroke();

        // Capsule background pill
        ctx.beginPath();
        const r = 3;
        if (ctx.roundRect) {
          ctx.roundRect(badgeLeft, badgeTop, badgeW, badgeH, r);
        } else {
          ctx.rect(badgeLeft, badgeTop, badgeW, badgeH);
        }
        ctx.fillStyle = isHovered
          ? 'rgba(255, 154, 46, 0.32)'
          : `rgba(18, 18, 18, ${0.85 * alpha})`;
        ctx.fill();

        ctx.strokeStyle = isHovered
          ? '#FF9A2E'
          : `rgba(255, 154, 46, ${0.55 * alpha})`;
        ctx.lineWidth = isHovered ? 1.2 : 0.8;
        ctx.stroke();

        // Plotted keyword label text
        ctx.fillStyle = isHovered
          ? '#FFFFFF'
          : `rgba(245, 245, 245, ${alpha})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.keyword, clampedX, clampedY + 0.5);
      });
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseenter', onMouseEnter);
      container.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [interactive, showRing, broken, activeKeywords]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#181818] overflow-hidden flex flex-col justify-between select-none cursor-crosshair group"
      style={{ minHeight: height }}
    >
      {/* 3D Canvas with smooth uniform motion */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Top telemetry: Live Node Counter */}
      <div className="relative z-10 px-5 pt-4 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-2 font-mono text-[9px] text-[#A0A0A0] tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF9A2E] animate-pulse"></span>
          <span>TOPOLOGY GRAPH // {activeKeywords.length} NODES</span>
        </div>
        <span className="font-mono text-[9px] text-[#FF9A2E] border border-[#FF9A2E]/30 bg-[#FF9A2E]/10 px-2 py-0.5 rounded">
          UNIFORM INERTIA · ACTIVE
        </span>
      </div>

      {/* Bottom overlay: Caption & Info */}
      <div className="relative z-10 px-5 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 text-xs font-nav-label text-[#F2F2F2]/70 pointer-events-none">
        {caption ? (
          <div>
            <p className="font-mono text-[10px] text-[#FF9A2E] tracking-widest uppercase mb-0.5">
              {caption}
            </p>
            <p className="text-[11px] font-normal leading-tight text-[#E0E0E0]">
              Hover or guide cursor to inspect paper nodes in 3D space.
            </p>
          </div>
        ) : (
          <div></div>
        )}

        {showScrollIcon && (
          <div className="hidden sm:flex flex-col items-center gap-1.5 opacity-60">
            <div className="w-4 h-7 border border-[#F2F2F2]/40 rounded-full flex justify-center pt-1.5">
              <div className="w-1 h-1.5 bg-[#FF9A2E] rounded-full animate-bounce"></div>
            </div>
            <span className="text-[9px] tracking-widest uppercase">SCROLL</span>
          </div>
        )}

        {showShare && (
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'PAPERMIND', url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            className="pointer-events-auto text-[10px] font-mono tracking-widest text-[#F2F2F2]/60 hover:text-[#FF9A2E] transition-colors cursor-pointer self-end sm:self-auto uppercase"
          >
            SHARE ↗
          </button>
        )}
      </div>
    </div>
  );
};

export default WireframeMesh;

