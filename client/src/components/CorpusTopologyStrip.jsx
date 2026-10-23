import React, { useEffect, useRef, useState } from 'react';

/**
 * CorpusTopologyStrip
 * An ultra-minimalist, architectural canvas graphic representing the semantic
 * vector dispersion and latent manifold topology of the user's research corpus.
 *
 * Characteristics:
 * - Pure Visual Rest State: ZERO text is displayed when the cursor is outside the boundary.
 * - Glowing Smooth Entrance: When the cursor enters the element boundary, the telemetry
 *   and coordinate text smoothly fades in with a warm, luminous glow.
 * - Slim Profile: 56px height, fits naturally between the headline and toolbar.
 * - 60 FPS Canvas: Delicate standing waveforms and drifting knowledge cluster nodes.
 */
const CorpusTopologyStrip = ({ paperCount = 0, tags = [] }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredCoords, setHoveredCoords] = useState(null);

  const physicsRef = useRef({
    time: 0,
    mouseX: -999,
    mouseY: -999,
    isHovering: false,
    nodes: [],
  });

  // Initialize nodes based on paper count or elegant defaults
  useEffect(() => {
    const count = Math.max(14, Math.min(28, (paperCount || 8) + 6));
    const newNodes = [];

    for (let i = 0; i < count; i++) {
      newNodes.push({
        baseX: (i / (count - 1)), // 0 to 1 normalized
        baseY: 0.5 + (Math.sin(i * 1.7) * 0.28) + ((Math.cos(i * 2.3) * 0.15)),
        offsetPhase: i * 0.45,
        speed: 0.8 + Math.random() * 0.6,
        radius: 2 + (i % 3 === 0 ? 1.5 : 0),
        isPrimary: i % 4 === 0,
        tag: tags[i % (tags.length || 1)] || 'EMBEDDING',
      });
    }

    physicsRef.current.nodes = newNodes;
  }, [paperCount, tags]);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let lastTime = performance.now();

    const handleResize = () => {
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      physicsRef.current.mouseX = x;
      physicsRef.current.mouseY = y;
      physicsRef.current.isHovering = true;
      setIsHovered(true);

      // Normalized coordinates for HUD
      const nx = ((x / rect.width) * 2 - 1).toFixed(3);
      const ny = (-((y / rect.height) * 2 - 1)).toFixed(3);
      setHoveredCoords({ x: nx, y: ny });
    };

    const onMouseLeave = () => {
      physicsRef.current.mouseX = -999;
      physicsRef.current.mouseY = -999;
      physicsRef.current.isHovering = false;
      setIsHovered(false);
      setHoveredCoords(null);
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);

    const render = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const physics = physicsRef.current;
      physics.time += dt * 0.7;
      const t = physics.time;

      // 1. Draw subtle background coordinate grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;

      // Horizontal zero axis
      ctx.beginPath();
      ctx.moveTo(0, height * 0.5);
      ctx.lineTo(width, height * 0.5);
      ctx.stroke();

      // Hairline vertical dividers (quarter intervals)
      for (let i = 1; i < 6; i++) {
        const x = (width / 6) * i;
        ctx.beginPath();
        ctx.setLineDash([2, 4]);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 2. Continuous Semantic Manifold Wave (Gaussian / Fourier Dispersion)
      // Primary Amber Wave (Topics Manifold)
      ctx.beginPath();
      for (let x = 0; x <= width; x += 3) {
        const nx = x / width;
        const wave1 = Math.sin(nx * 7.5 + t * 1.2) * 11;
        const wave2 = Math.cos(nx * 14.0 - t * 0.8) * 5;
        const envelope = Math.sin(nx * Math.PI); // Dampened at edges
        const y = height * 0.5 + (wave1 + wave2) * envelope;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255, 154, 46, 0.35)';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // Secondary Cyan Wave (Citation Coupling)
      ctx.beginPath();
      for (let x = 0; x <= width; x += 4) {
        const nx = x / width;
        const wave = Math.sin(nx * 11.0 - t * 1.5) * 8 * Math.sin(nx * Math.PI);
        const y = height * 0.5 + wave;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(84, 185, 255, 0.2)';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Compute Animated Nodes Positions
      const projectedNodes = physics.nodes.map((node) => {
        const px = node.baseX * width;
        const oscillation = Math.sin(t * node.speed + node.offsetPhase) * 10;
        const py = node.baseY * height + oscillation;

        // Subtle cursor attraction
        let dx = 0;
        let dy = 0;
        if (physics.isHovering) {
          const distToMouse = Math.hypot(physics.mouseX - px, physics.mouseY - py);
          if (distToMouse < 90) {
            const pull = (1 - distToMouse / 90) * 8;
            dx = ((physics.mouseX - px) / distToMouse) * pull;
            dy = ((physics.mouseY - py) / distToMouse) * pull;
          }
        }

        return {
          ...node,
          x: px + dx,
          y: Math.max(6, Math.min(height - 6, py + dy)),
        };
      });

      // 4. Draw Connecting Filaments between neighboring nodes
      ctx.lineWidth = 0.8;
      for (let i = 0; i < projectedNodes.length - 1; i++) {
        const p1 = projectedNodes[i];
        const p2 = projectedNodes[i + 1];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

        if (dist < width * 0.14) {
          const alpha = (1 - dist / (width * 0.14)) * 0.25;
          ctx.strokeStyle = `rgba(255, 154, 46, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // 5. Draw Nodal Spheres (Corpus Points)
      for (let i = 0; i < projectedNodes.length; i++) {
        const node = projectedNodes[i];

        // Glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = node.isPrimary
          ? 'rgba(255, 154, 46, 0.25)'
          : 'rgba(84, 185, 255, 0.15)';
        ctx.fill();

        // Node Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.isPrimary ? '#FF9A2E' : '#FFFFFF';
        ctx.fill();
      }

      // 6. Interactive Cursor Crosshair & Coordinate Telemetry
      if (physics.isHovering && physics.mouseX >= 0) {
        // Vertical Hairline
        ctx.strokeStyle = 'rgba(255, 154, 46, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(physics.mouseX, 0);
        ctx.lineTo(physics.mouseX, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Intersection point
        ctx.beginPath();
        ctx.arc(physics.mouseX, physics.mouseY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#FF9A2E';
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setHoveredCoords(null);
      }}
      className={`group relative w-full h-[52px] sm:h-[56px] bg-[#121313] border rounded-xl overflow-hidden flex items-center justify-between px-4 sm:px-6 select-none my-4 shadow-xs transition-all duration-500 ease-out ${
        isHovered
          ? 'border-primary-container/40 shadow-[0_0_24px_rgba(255,154,46,0.12)]'
          : 'border-outline-variant/25'
      }`}
    >
      {/* Background Interactive Topology Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair z-0"
      />

      {/* Telemetry Text Overlay - COMPLETELY INVISIBLE when cursor is out of boundary, glows in smoothly on hover */}
      <div
        className={`relative z-10 w-full flex items-center justify-between pointer-events-none transition-all duration-500 ease-out ${
          isHovered
            ? 'opacity-100 translate-y-0 filter-none'
            : 'opacity-0 translate-y-1.5'
        }`}
      >
        {/* Left Monospace Telemetry */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-primary-container/35 shadow-[0_0_14px_rgba(255,154,46,0.25)]">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container shadow-[0_0_8px_#ff9a2e] animate-pulse" />
            <span className="font-mono text-[10px] font-bold text-primary-container tracking-widest uppercase drop-shadow-[0_0_8px_rgba(255,154,46,0.6)]">
              CORPUS TOPOLOGY
            </span>
            <span className="font-mono text-[9px] text-white/50 tracking-wider hidden md:inline">
              // 1536-D LATENT MANIFOLD
            </span>
          </div>
        </div>

        {/* Center Live Coordinates */}
        {hoveredCoords && (
          <div className="hidden sm:flex items-center gap-2 font-mono text-[9px] text-primary-container bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-primary-container/40 shadow-[0_0_14px_rgba(255,154,46,0.3)] animate-fade-in">
            <span className="text-white/50">VECTOR</span>
            <span className="font-bold text-white drop-shadow-[0_0_6px_rgba(255,154,46,0.8)]">λ: {hoveredCoords.x}</span>
            <span className="text-white/30">|</span>
            <span className="font-bold text-white drop-shadow-[0_0_6px_rgba(255,154,46,0.8)]">θ: {hoveredCoords.y}</span>
          </div>
        )}

        {/* Right Telemetry */}
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-[0_0_12px_rgba(255,154,46,0.15)] text-white/90">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span className="text-[9px] tracking-wider font-semibold drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">
              {paperCount} MANUSCRIPTS MAPPED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorpusTopologyStrip;
