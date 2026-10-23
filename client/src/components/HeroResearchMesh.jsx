import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';

/**
 * RESEARCH_FACTS
 * Intriguing, empirical research milestones and cognitive laws that spark deep curiosity about studying,
 * reading bandwidth, and scientific discovery.
 */
export const RESEARCH_FACTS = [
  {
    id: 1,
    tag: 'COGNITIVE BANDWIDTH',
    title: 'The 3.4M Paper Dilemma',
    stat: '3,400,000+',
    unit: 'Papers Published / Year',
    fact: 'Over 3.4 million peer-reviewed scientific manuscripts are published globally each year. The average PhD researcher reads only ~240. Without machine synthesis, 99.9% of scientific breakthroughs remain unread.',
    curiosityHook: 'How do you discover the seminal insight nobody has time to read?',
  },
  {
    id: 2,
    tag: 'ATTENTION MECHANISM',
    title: 'The Transformer Epoch',
    stat: '130,000+',
    unit: 'Seminal Citations',
    fact: '"Attention Is All You Need" (Vaswani 2017) eliminated recursive bottlenecks, enabling machines to attend across entire 100-page manuscripts simultaneously to reveal hidden analogies.',
    curiosityHook: 'Why linear reading became obsolete for deep comprehension.',
  },
  {
    id: 3,
    tag: 'VECTOR GEOMETRY',
    title: '1,536-Dimensional Semantic Space',
    stat: '1,536',
    unit: 'Geometric Dimensions',
    fact: 'Every academic passage in Papermind is mapped into a 1,536-dimensional coordinate vector. In this mathematical universe, semantic comprehension is measured by pure Euclidean proximity.',
    curiosityHook: 'Human ideas are not text strings — they are geometric shapes in Hilbert space.',
  },
  {
    id: 4,
    tag: 'MEMORY SCIENCE',
    title: 'Miller’s Law & Semantic Chunking',
    stat: '4 ± 1',
    unit: 'Working Memory Items',
    fact: 'Cognitive scientist George Miller proved that human working memory can only hold 4 to 7 discrete items. Papermind partitions 50-page PDFs into ~500-token semantic chunks to mirror biological cognition.',
    curiosityHook: 'Your brain and modern vector engines share the exact same chunk limit.',
  },
  {
    id: 5,
    tag: 'INFORMATION THEORY',
    title: 'Shannon Entropy in Prose',
    stat: '1.44 bits',
    unit: 'True Density / Character',
    fact: 'Claude Shannon proved that academic English holds only ~1.44 bits of novel information per character. 80% of research writing is grammatical scaffolding around a dense conceptual kernel.',
    curiosityHook: 'Can you extract the pure mathematical entropy of a 40-page dissertation?',
  },
  {
    id: 6,
    tag: 'FORGETTING CURVE',
    title: 'The Ebbinghaus Decay',
    stat: '70% Lost',
    unit: 'Within 24 Hours',
    fact: 'Without active questioning, human memory loses over 70% of newly read academic papers within 24 hours. Interrogating a paper via conversational synthesis turns passive reading into permanent mastery.',
    curiosityHook: 'Reading without dialogue is like inscribing discoveries in disappearing ink.',
  },
  {
    id: 7,
    tag: 'EPISTEMIC GROUNDING',
    title: 'Deterministic Page Verification',
    stat: '0.0%',
    unit: 'Tolerance for Hallucination',
    fact: 'Standard generative AI creates fictional citations. Deterministic RAG enforces cryptographic grounding, anchoring every statement directly to exact paragraph bounding boxes on the original PDF.',
    curiosityHook: 'Truth requires strict page-level accountability, not statistical guesses.',
  },
  {
    id: 8,
    tag: 'POWER LAWS',
    title: 'The Zipfian Knowledge Gravity',
    stat: 'Top 1%',
    unit: 'Drives 80% of Breakthroughs',
    fact: 'Scientific citations strictly follow a Pareto power law: less than 1% of papers in any discipline attract 80% of cross-field citations, functioning as foundational gravity wells for all downstream science.',
    curiosityHook: 'Which forgotten foundation holds the key to your current research hypothesis?',
  },
  {
    id: 9,
    tag: 'COGNITIVE CLARITY',
    title: 'The Feynman Heuristic',
    stat: '1st Principles',
    unit: 'Intuitive Synthesis',
    fact: 'Nobel physicist Richard Feynman argued that if you cannot explain a complex mechanism in clear, jargon-free analogies, you do not truly understand it. Ask any paper to synthesize itself for you.',
    curiosityHook: 'Can you prompt the deepest paper in your library to explain itself simply?',
  },
  {
    id: 10,
    tag: 'GRAPH TOPOLOGY',
    title: 'Six Degrees of Discovery',
    stat: '3 Hops',
    unit: 'Average Path Length',
    fact: 'Global citation topology analysis across 100M+ publications shows that virtually any two scientific breakthroughs — from CRISPR to Quantum Computing — are linked within 3 to 4 citation hops.',
    curiosityHook: 'What unexpected discipline is silently connected to your field right now?',
  },
  {
    id: 11,
    tag: 'REPRODUCIBILITY',
    title: 'The Replication Threshold',
    stat: '54%',
    unit: 'Replication Failure Rate',
    fact: 'Over half of published empirical findings fail independent replication due to implicit methodology parameters. Deep chunk inspection allows researchers to dissect protocols step-by-step.',
    curiosityHook: 'What subtle parameter was buried between page 14 and 16?',
  },
  {
    id: 12,
    tag: 'CROSS-POLLINATION',
    title: 'Interdisciplinary Synthesis',
    stat: '3.2×',
    unit: 'Citation Impact Multiplier',
    fact: 'Papers that fuse paradigms from two historically unrelated fields achieve 3.2× higher long-term scientific citation velocity than those published within single-discipline silos.',
    curiosityHook: 'True innovation lives at the boundary where two distinct libraries meet.',
  },
];

/**
 * HeroResearchMesh
 * An intriguing, interactive 3D Knowledge Lattice rendered in WebGL-grade Canvas.
 * Combines golden-ratio icosahedron topology with interactive research facts.
 */
const HeroResearchMesh = ({ onExploreClick }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [activeFactIndex, setActiveFactIndex] = useState(0);
  const [hoveredNodeIndex, setHoveredNodeIndex] = useState(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(1);

  const activeFact = useMemo(() => RESEARCH_FACTS[activeFactIndex] || RESEARCH_FACTS[0], [activeFactIndex]);

  // Golden ratio vertices for an icosahedron (12 vertices matching 12 facts)
  const baseGeometry = useMemo(() => {
    const phi = (1 + Math.sqrt(5)) / 2;
    const verts = [
      [-1,  phi, 0], [ 1,  phi, 0], [-1, -phi, 0], [ 1, -phi, 0],
      [0, -1,  phi], [0,  1,  phi], [0, -1, -phi], [0,  1, -phi],
      [ phi, 0, -1], [ phi, 0,  1], [-phi, 0, -1], [-phi, 0,  1],
    ];

    // Normalize vertices to unit sphere
    const normalizedVerts = verts.map(([x, y, z]) => {
      const len = Math.sqrt(x * x + y * y + z * z);
      return [x / len, y / len, z / len];
    });

    // Edges between icosahedron vertices (rest length ~ 1.05)
    const edges = [];
    for (let i = 0; i < normalizedVerts.length; i++) {
      for (let j = i + 1; j < normalizedVerts.length; j++) {
        const dx = normalizedVerts[i][0] - normalizedVerts[j][0];
        const dy = normalizedVerts[i][1] - normalizedVerts[j][1];
        const dz = normalizedVerts[i][2] - normalizedVerts[j][2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        // Icosahedron neighbors have dist approx 1.05
        if (dist > 0.95 && dist < 1.15) {
          edges.push([i, j]);
        }
      }
    }

    return { vertices: normalizedVerts, edges };
  }, []);

  // Cycle to next fact
  const handleNextFact = useCallback(() => {
    setActiveFactIndex((prev) => (prev + 1) % RESEARCH_FACTS.length);
  }, []);

  // Cycle to prev fact
  const handlePrevFact = useCallback(() => {
    setActiveFactIndex((prev) => (prev - 1 + RESEARCH_FACTS.length) % RESEARCH_FACTS.length);
  }, []);

  // Spark random curiosity fact
  const handleSparkCuriosity = useCallback(() => {
    let nextIdx = Math.floor(Math.random() * RESEARCH_FACTS.length);
    if (nextIdx === activeFactIndex) {
      nextIdx = (nextIdx + 1) % RESEARCH_FACTS.length;
    }
    setActiveFactIndex(nextIdx);
    setIsAutoPlaying(false);
  }, [activeFactIndex]);

  // Auto-play timer for facts
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      handleNextFact();
    }, 7000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, handleNextFact]);

  // Persistent physics and animation state that survives React re-renders without resetting
  const physicsRef = useRef({
    angleX: 0.25,
    angleY: 0.6,
    targetTiltX: 0,
    targetTiltY: 0,
    currentTiltX: 0,
    currentTiltY: 0,
    activeFactIndex: 0,
    hoveredNodeIndex: null,
    rotationSpeed: 1,
    isHovering: false,
    projectedNodes: [],
  });

  // Keep physics ref in sync with React state
  useEffect(() => {
    physicsRef.current.activeFactIndex = activeFactIndex;
  }, [activeFactIndex]);

  useEffect(() => {
    physicsRef.current.hoveredNodeIndex = hoveredNodeIndex;
  }, [hoveredNodeIndex]);

  useEffect(() => {
    physicsRef.current.rotationSpeed = rotationSpeed;
  }, [rotationSpeed]);

  // Main Canvas Render Loop (Runs continuously without resetting on state updates)
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

      const nx = (x / rect.width - 0.5) * 2; // -1 to 1
      const ny = (y / rect.height - 0.5) * 2; // -1 to 1

      const physics = physicsRef.current;
      physics.targetTiltY = nx * 0.75;
      physics.targetTiltX = ny * 0.55;
      physics.isHovering = true;

      // Hit test projected nodes
      let hitIdx = null;
      const nodes = physics.projectedNodes;
      for (let i = 0; i < nodes.length; i++) {
        const p = nodes[i];
        if (p.z > -0.35) {
          const dx = x - p.x;
          const dy = y - p.y;
          if (dx * dx + dy * dy < 24 * 24) {
            hitIdx = p.index;
            break;
          }
        }
      }

      if (hitIdx !== physics.hoveredNodeIndex) {
        physics.hoveredNodeIndex = hitIdx;
        setHoveredNodeIndex(hitIdx);
        if (hitIdx !== null && hitIdx !== physics.activeFactIndex) {
          physics.activeFactIndex = hitIdx;
          setActiveFactIndex(hitIdx);
          setIsAutoPlaying(false);
        }
      }
    };

    const onMouseLeave = () => {
      const physics = physicsRef.current;
      physics.targetTiltX = 0;
      physics.targetTiltY = 0;
      physics.isHovering = false;
      if (physics.hoveredNodeIndex !== null) {
        physics.hoveredNodeIndex = null;
        setHoveredNodeIndex(null);
      }
    };

    // Mobile touch handlers for direct rotational drag and node tap detection
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let isTouchActive = false;

    const onTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      touchStartX = x;
      touchStartY = y;
      lastTouchX = x;
      lastTouchY = y;
      isTouchActive = true;

      // Tap hit detection against 3D nodes
      const physics = physicsRef.current;
      const nodes = physics.projectedNodes || [];
      let hitIdx = null;
      for (let i = 0; i < nodes.length; i++) {
        const p = nodes[i];
        if (p.z > -0.35) {
          const dx = x - p.x;
          const dy = y - p.y;
          if (dx * dx + dy * dy < 34 * 34) { // Generous touch target
            hitIdx = p.index;
            break;
          }
        }
      }

      if (hitIdx !== null) {
        physics.activeFactIndex = hitIdx;
        physics.hoveredNodeIndex = hitIdx;
        setActiveFactIndex(hitIdx);
        setHoveredNodeIndex(hitIdx);
        setIsAutoPlaying(false);
      }
    };

    const onTouchMove = (e) => {
      if (!isTouchActive || !e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const dx = x - lastTouchX;
      const dy = y - lastTouchY;
      lastTouchX = x;
      lastTouchY = y;

      const physics = physicsRef.current;
      // Direct drag rotation on mobile swipe
      physics.angleY += dx * 0.007;
      physics.angleX += dy * 0.007;

      const nx = (x / rect.width - 0.5) * 2;
      const ny = (y / rect.height - 0.5) * 2;
      physics.targetTiltY = nx * 0.6;
      physics.targetTiltX = ny * 0.4;
      physics.isHovering = true;
    };

    const onTouchEnd = () => {
      isTouchActive = false;
      const physics = physicsRef.current;
      physics.targetTiltX = 0;
      physics.targetTiltY = 0;
      physics.isHovering = false;
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd);

    // 3D rotation matrices
    const rotateY = (x, y, z, a) => {
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      return [x * cos + z * sin, y, -x * sin + z * cos];
    };

    const rotateX = (x, y, z, a) => {
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      return [x, y * cos - z * sin, y * sin + z * cos];
    };

    const render = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05); // Capped to 50ms for smooth delta
      lastTime = time;

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const physics = physicsRef.current;

      // Smooth, uniform base rotation speeds (radians/second)
      const baseSpeedY = physics.isHovering ? 0.12 : 0.22;
      const baseSpeedX = physics.isHovering ? 0.04 : 0.08;

      physics.angleY += baseSpeedY * dt * physics.rotationSpeed;
      physics.angleX += baseSpeedX * dt * physics.rotationSpeed;

      // Smooth damped spring interpolation for cursor steering
      const damping = 1 - Math.exp(-4.5 * dt);
      physics.currentTiltX += (physics.targetTiltX - physics.currentTiltX) * damping;
      physics.currentTiltY += (physics.targetTiltY - physics.currentTiltY) * damping;

      const totalAngleX = physics.angleX + physics.currentTiltX;
      const totalAngleY = physics.angleY + physics.currentTiltY;

      // Adaptive center: On mobile, position the 3D lattice in the upper dedicated viewing arena clear of the card!
      const isMobile = width < 640;
      const centerX = width / 2;
      const centerY = isMobile ? Math.max(160, Math.min(height * 0.28, 205)) : height / 2;
      const radius = isMobile ? Math.min(width * 0.33, 125) : Math.min(width, height) * 0.32;
      const fov = 650;

      // 1. Draw Subtle Ambient Orbital Rings in 3D
      ctx.save();
      ctx.translate(centerX, centerY);

      // Horizontal Ring with subtle dash
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.45, radius * 0.45, 0.15, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 154, 46, 0.14)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Outer Fine Ring
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.55, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();

      // 2. Project 3D Vertices
      const projected = [];
      const { vertices, edges } = baseGeometry;

      for (let i = 0; i < vertices.length; i++) {
        let [vx, vy, vz] = vertices[i];

        vx *= radius;
        vy *= radius;
        vz *= radius;

        let [r1x, r1y, r1z] = rotateY(vx, vy, vz, totalAngleY);
        let [r2x, r2y, r2z] = rotateX(r1x, r1y, r1z, totalAngleX);

        const depth = r2z + fov;
        const scale = fov / depth;
        const px = centerX + r2x * scale;
        const py = centerY + r2y * scale;

        const normZ = (r2z + radius) / (radius * 2);

        projected.push({
          index: i,
          x: px,
          y: py,
          z: r2z / radius,
          scale,
          normZ: Math.max(0, Math.min(1, normZ)),
        });
      }

      physics.projectedNodes = projected;

      // 3. Draw Connecting Edges (Lines of the Knowledge Lattice)
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let e = 0; e < edges.length; e++) {
        const [i1, i2] = edges[e];
        const p1 = projected[i1];
        const p2 = projected[i2];

        const avgNormZ = (p1.normZ + p2.normZ) / 2;
        const isConnectedToActive = i1 === physics.activeFactIndex || i2 === physics.activeFactIndex;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);

        if (isConnectedToActive) {
          ctx.strokeStyle = `rgba(255, 154, 46, ${0.45 + avgNormZ * 0.4})`;
          ctx.lineWidth = 1.6;
          ctx.shadowColor = '#FF9A2E';
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          const alpha = 0.08 + avgNormZ * 0.22;
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // 4. Draw Core Inner Octahedron / Pulsing Knowledge Crystal
      const coreRadius = radius * 0.42;
      const coreAngleY = -totalAngleY * 1.35;
      const coreAngleX = -totalAngleX * 1.1;

      const coreVerts = [
        [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]
      ];

      const projCore = coreVerts.map(([cx, cy, cz]) => {
        let [r1x, r1y, r1z] = rotateY(cx * coreRadius, cy * coreRadius, cz * coreRadius, coreAngleY);
        let [r2x, r2y, r2z] = rotateX(r1x, r1y, r1z, coreAngleX);
        const scale = fov / (r2z + fov);
        return {
          x: centerX + r2x * scale,
          y: centerY + r2y * scale,
          z: r2z / coreRadius,
        };
      });

      const coreEdges = [
        [0, 2], [0, 3], [0, 4], [0, 5],
        [1, 2], [1, 3], [1, 4], [1, 5],
        [2, 4], [4, 3], [3, 5], [5, 2]
      ];

      for (let c = 0; c < coreEdges.length; c++) {
        const [c1, c2] = coreEdges[c];
        ctx.beginPath();
        ctx.moveTo(projCore[c1].x, projCore[c1].y);
        ctx.lineTo(projCore[c2].x, projCore[c2].y);
        ctx.strokeStyle = 'rgba(255, 154, 46, 0.22)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 5. Draw Vertices (Nodes representing Research Facts)
      const sortedNodes = [...projected].sort((a, b) => a.z - b.z);

      for (let n = 0; n < sortedNodes.length; n++) {
        const node = sortedNodes[n];
        const isTarget = node.index === physics.activeFactIndex;
        const isHovered = node.index === physics.hoveredNodeIndex;
        const fact = RESEARCH_FACTS[node.index];

        const baseR = 3.5 + node.normZ * 2.5;

        if (isTarget || isHovered) {
          const pulse = Math.sin(time * 0.005) * 3;
          ctx.beginPath();
          ctx.arc(node.x, node.y, baseR + 9 + pulse, 0, Math.PI * 2);
          ctx.strokeStyle = '#FF9A2E';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(node.x, node.y, baseR + 14, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 154, 46, 0.16)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, baseR + 2, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = '#FF9A2E';
          ctx.shadowBlur = 16;
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.save();
          ctx.font = '600 10px JetBrains Mono, monospace';
          ctx.fillStyle = '#FF9A2E';
          const labelText = `[0${fact.id} // ${fact.tag}]`;
          const textWidth = ctx.measureText(labelText).width;
          const textX = (node.x + baseR + 14 + textWidth > width - 10)
            ? node.x - baseR - 14 - textWidth
            : node.x + baseR + 14;
          ctx.fillText(labelText, textX, node.y + 3);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(node.x, node.y, baseR, 0, Math.PI * 2);
          ctx.fillStyle = node.normZ > 0.4 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.35)';
          ctx.fill();

          if (node.normZ > 0.5) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, baseR * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#FF9A2E';
            ctx.fill();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [baseGeometry]);

  const [isTelemetryExpanded, setIsTelemetryExpanded] = useState(true);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[660px] sm:min-h-[580px] lg:min-h-[640px] bg-[#141515] overflow-hidden select-none font-sans flex flex-col justify-between touch-pan-y"
    >
      {/* 1. Canvas Layer (Interactive 3D Knowledge Mesh) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair z-0"
      />

      {/* 2. Top Telemetry Bar */}
      <div className="relative z-10 w-full p-3 sm:p-5 sm:px-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 border-b border-white/10 bg-gradient-to-b from-[#141515]/90 to-transparent backdrop-blur-xs font-mono text-[10px] sm:text-[11px]">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-black/40 border border-white/15 text-[#f1f0f0]">
            <span className="w-2 h-2 rounded-full bg-[#FF9A2E] animate-pulse shadow-[0_0_8px_#ff9a2e]" />
            <span className="font-bold tracking-wider uppercase">LATTICE // 12 LAWS</span>
          </div>
          <span className="text-[#888888] hidden md:inline">1536-DIM TOPOLOGY</span>
          <span className="sm:hidden text-[9px] text-[#FF9A2E] bg-[#FF9A2E]/10 border border-[#FF9A2E]/20 px-2 py-0.5 rounded">
            👆 TAP NODES · SWIPE TO ROTATE
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-[#aaaaaa]">
          <button
            onClick={() => setRotationSpeed((s) => (s === 1 ? 0.4 : s === 0.4 ? 2 : 1))}
            className="hover:text-white transition-colors cursor-pointer border border-white/15 rounded px-2 py-0.5 sm:px-2.5 sm:py-1 bg-black/40 text-[9px] sm:text-[11px]"
            title="Adjust rotational velocity"
          >
            VELOCITY: {rotationSpeed === 1 ? '1.0× NORMAL' : rotationSpeed === 0.4 ? '0.4× DAMPED' : '2.0× ORBIT'}
          </button>
          <span className="hidden sm:inline text-white/30">|</span>
          <span className="hidden sm:inline text-[#888888]">DRAG TO ORIENT</span>
        </div>
      </div>

      {/* 3. Floating Interactive Research Curiosity Telemetry Capsule (Positioned cleanly below 3D sphere on mobile) */}
      <div className="relative z-20 px-3 sm:px-6 sm:px-10 py-2 sm:py-6 max-w-xl w-full">
        <div className="bg-[#1b1c1c]/90 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 sm:p-6 shadow-2xl space-y-2.5 sm:space-y-4 font-sans animate-fade-in transition-all">
          {/* Header Row: Empirical Tag, Stepper Controls & Mobile Minimize Toggle */}
          <div className="flex items-center justify-between font-mono text-xs pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-[#FF9A2E] font-bold tracking-widest uppercase text-[11px] sm:text-xs">
                [{activeFact.tag}]
              </span>
              <span className="text-white/40">·</span>
              <span className="text-[#888888] text-[10px] sm:text-xs">
                NODE 0{activeFact.id} / 12
              </span>
            </div>

            {/* Stepper Controls & Mobile Toggle */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setIsTelemetryExpanded(!isTelemetryExpanded)}
                className="sm:hidden text-[9px] font-mono px-2 py-1 rounded border border-white/15 text-[#FF9A2E] bg-white/5 active:bg-white/10"
                title="Toggle Telemetry Card Details"
              >
                {isTelemetryExpanded ? 'COMPACT ▾' : 'EXPAND ▴'}
              </button>
              <button
                onClick={handlePrevFact}
                className="w-7 h-7 rounded border border-white/20 text-[#f1f0f0] hover:bg-white/10 active:scale-95 flex items-center justify-center cursor-pointer transition-colors font-mono text-xs"
                title="Previous Fact"
              >
                ←
              </button>
              <button
                onClick={handleNextFact}
                className="w-7 h-7 rounded border border-white/20 text-[#f1f0f0] hover:bg-white/10 active:scale-95 flex items-center justify-center cursor-pointer transition-colors font-mono text-xs"
                title="Next Fact"
              >
                →
              </button>
            </div>
          </div>

          {/* Main Stat & Title */}
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-baseline gap-2.5 sm:gap-3">
              <span className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight">
                {activeFact.stat}
              </span>
              <span className="font-mono text-[10px] sm:text-xs text-[#FF9A2E] font-medium tracking-wider uppercase">
                {activeFact.unit}
              </span>
            </div>
            <h3 className="font-display text-base sm:text-2xl text-[#f1f0f0] font-semibold leading-snug">
              {activeFact.title}
            </h3>
          </div>

          {/* Expandable Fact Body and Curiosity Hook on Mobile */}
          {isTelemetryExpanded && (
            <>
              {/* Explanatory Research Fact Body */}
              <p className="text-xs sm:text-sm text-[#cccccc] leading-relaxed font-sans line-clamp-3 sm:line-clamp-none">
                {activeFact.fact}
              </p>

              {/* Curiosity Hook & Call to Explore */}
              <div className="pt-2 sm:pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono text-[#FF9A2E]">
                  <span className="text-xs sm:text-sm">✦</span>
                  <span className="italic">{activeFact.curiosityHook}</span>
                </div>

                <button
                  onClick={handleSparkCuriosity}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF9A2E]/10 hover:bg-[#FF9A2E]/20 text-[#FF9A2E] border border-[#FF9A2E]/30 rounded-full font-mono text-[10px] tracking-wider uppercase transition-colors cursor-pointer self-start sm:self-auto shrink-0 font-bold"
                  title="Jump to random research empirical fact"
                >
                  <span>⚡ SPARK CURIOSITY</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. Bottom HUD Strip (Minimal Scientific Details) */}
      <div className="relative z-10 w-full px-4 sm:px-10 py-3 sm:py-4 bg-gradient-to-t from-[#141515] to-transparent border-t border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 font-mono text-[10px] text-[#777777]">
        <div className="hidden sm:flex items-center gap-4 flex-wrap">
          <span>GOLDEN RATIO Φ = 1.618033</span>
          <span>·</span>
          <span>EULER CHARACTERISTIC V-E+F = 2</span>
          <span>·</span>
          <span>GEODESIC LATENCY: 12ms</span>
        </div>

        <div className="flex sm:hidden items-center justify-between w-full text-[9px] text-white/50">
          <span>GEODESIC LATTICE // 12 LAWS</span>
          <span className="text-[#FF9A2E]">TAP ANY NODE TO INSPECT</span>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <span className="text-[#FF9A2E]">HOVER OR TAP ANY GLOWING NODE TO UNROLL GROUNDED EVIDENCE</span>
        </div>
      </div>
    </div>
  );
};

export default HeroResearchMesh;
