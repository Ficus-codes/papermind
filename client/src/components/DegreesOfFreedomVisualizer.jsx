import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * DegreesOfFreedomVisualizer
 * Interactive, high-precision scientific canvas demonstrating the concept of "Degrees of Freedom" (DoF).
 * 
 * - Mode P (Physics):
 *   Classical & statistical mechanics of a 3D rigid body (6 DoF: 3 Translational Tx, Ty, Tz + 3 Rotational Rx, Ry, Rz).
 *   Features orthogonal coordinate frames, rotational gimbals, phase-space trajectory trails, and equipartition telemetry.
 * 
 * - Mode C (Chemistry):
 *   Molecular physical chemistry of water (H₂O: 1 central Oxygen atom linked to 2 individual, single Hydrogen atoms).
 *   3N DoF = 9 total DoF (3 Translational + 3 Rotational + [3N - 6 = 3] Vibrational normal modes:
 *   ν₁ Symmetric Stretch, ν₂ Scissoring Bend, ν₃ Asymmetric Stretch).
 * 
 * Scrolling & Zooming Architecture:
 * - DEFAULT MODE: Normal page scrolling is 100% unimpeded. Hovering the cursor inside the visual element
 *   does NOT activate zoom or intercept scrolling in any way.
 * - ACTIVATED ZOOM MODE: Users can explicitly toggle "ZOOM 3D" mode via the toolbar toggle or HUD pill
 *   when they want the mouse wheel to zoom the 3D element.
 * - DIRECT BUTTONS: Clickable [ − ], [ 100% ], [ + ] zoom controls always work with a single click.
 */
const DegreesOfFreedomVisualizer = () => {
  const [mode, setMode] = useState('P'); // 'P' (Physics) | 'C' (Chemistry)
  const [velocity, setVelocity] = useState(1.0); // 0.2 to 3.0
  const [zoom, setZoom] = useState(1.0); // 0.4 to 2.8
  const [wheelZoomEnabled, setWheelZoomEnabled] = useState(false); // DEFAULT: false (page scrolls freely!)
  const [isMathDefExpanded, setIsMathDefExpanded] = useState(false); // DEFAULT: collapsed state
  const [activeChemSubmode, setActiveChemSubmode] = useState('ALL'); // 'ALL' | 'SYM_STRETCH' | 'BEND' | 'ASYM_STRETCH'
  const [activePhysSubmode, setActivePhysSubmode] = useState('ALL'); // 'ALL' | 'TRANS' | 'ROT'
  const [isPaused, setIsPaused] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Persistent physics and animation state that survives React re-renders without resetting
  const physicsRef = useRef({
    mode: 'P',
    velocity: 1.0,
    zoom: 1.0,
    targetZoom: 1.0,
    wheelZoomEnabled: false,
    chemSubmode: 'ALL',
    physSubmode: 'ALL',
    isPaused: false,
    
    // Rotation & Orientation
    angleX: 0.35,
    angleY: 0.55,
    targetTiltX: 0,
    targetTiltY: 0,
    currentTiltX: 0,
    currentTiltY: 0,
    isHovering: false,

    // Phase / Harmonic Timers
    timeSec: 0,
    vibPhase: 0,
    transPhase: 0,

    // Trajectory History for Mode P (Phase Space Trail)
    trailPoints: [],
    
    // Transition blend between Mode P and Mode C (0 = Mode P, 1 = Mode C)
    modeBlend: 0,
    targetModeBlend: 0,
  });

  // Direct zoom helper
  const handleZoomChange = useCallback((newVal) => {
    const clamped = Math.min(2.8, Math.max(0.4, Math.round(newVal * 10) / 10));
    physicsRef.current.targetZoom = clamped;
    setZoom(clamped);
  }, []);

  // Sync state to physicsRef without tearing down the canvas loop
  useEffect(() => {
    physicsRef.current.mode = mode;
    physicsRef.current.targetModeBlend = mode === 'C' ? 1.0 : 0.0;
    if (mode === 'C') {
      physicsRef.current.trailPoints = [];
    }
  }, [mode]);

  useEffect(() => {
    physicsRef.current.velocity = velocity;
  }, [velocity]);

  useEffect(() => {
    physicsRef.current.targetZoom = zoom;
  }, [zoom]);

  useEffect(() => {
    physicsRef.current.wheelZoomEnabled = wheelZoomEnabled;
  }, [wheelZoomEnabled]);

  useEffect(() => {
    physicsRef.current.chemSubmode = activeChemSubmode;
  }, [activeChemSubmode]);

  useEffect(() => {
    physicsRef.current.physSubmode = activePhysSubmode;
  }, [activePhysSubmode]);

  useEffect(() => {
    physicsRef.current.isPaused = isPaused;
  }, [isPaused]);

  // Main Canvas Render Loop
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
      canvas.height = Math.round((rect.height || 420) * dpr);
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
      physics.targetTiltY = nx * 0.7;
      physics.targetTiltX = ny * 0.5;
      physics.isHovering = true;
    };

    const onMouseLeave = () => {
      const physics = physicsRef.current;
      physics.targetTiltX = 0;
      physics.targetTiltY = 0;
      physics.isHovering = false;
    };

    // Mouse-wheel handler:
    // In DEFAULT MODE (wheelZoomEnabled === false):
    // Returns immediately. Does NOT prevent default. Page scrolls natively with zero interference.
    const onWheel = (e) => {
      if (!physicsRef.current.wheelZoomEnabled) {
        return; // Allow native page scroll unimpeded!
      }

      // ACTIVATED ZOOM MODE:
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      const curTarget = physicsRef.current.targetZoom;
      const newZoom = Math.min(2.8, Math.max(0.4, curTarget * factor));
      physicsRef.current.targetZoom = newZoom;
      setZoom(parseFloat(newZoom.toFixed(2)));
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('wheel', onWheel, { passive: false });

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
      const dt = Math.min((time - lastTime) / 1000, 0.05); // Capped to 50ms
      lastTime = time;

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const physics = physicsRef.current;
      const effectiveDt = physics.isPaused ? 0 : dt * physics.velocity;

      // Snappy and smooth transition blend between Mode P and Mode C
      physics.modeBlend += (physics.targetModeBlend - physics.modeBlend) * (1 - Math.exp(-12 * dt));

      // Smooth spring damping for zoom factor
      physics.zoom += (physics.targetZoom - physics.zoom) * (1 - Math.exp(-8 * dt));
      const currentZoom = physics.zoom;

      // Continuous base rotational speeds
      const baseSpeedY = physics.isHovering ? 0.15 : 0.28;
      const baseSpeedX = physics.isHovering ? 0.06 : 0.12;

      physics.angleY += baseSpeedY * effectiveDt;
      physics.angleX += baseSpeedX * effectiveDt;

      physics.timeSec += effectiveDt;
      physics.vibPhase += effectiveDt * 3.8;
      physics.transPhase += effectiveDt * 1.5;

      // Exponential spring damping for mouse tilt
      const damping = 1 - Math.exp(-5.0 * dt);
      physics.currentTiltX += (physics.targetTiltX - physics.currentTiltX) * damping;
      physics.currentTiltY += (physics.targetTiltY - physics.currentTiltY) * damping;

      const totalAngleX = physics.angleX + physics.currentTiltX;
      const totalAngleY = physics.angleY + physics.currentTiltY;

      const centerX = width / 2;
      const centerY = height / 2;
      const fov = 680;
      const scaleRadius = Math.min(width, height) * 0.28 * currentZoom;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // =========================================================================
      // RENDER MODE P: PHYSICS (6 DEGREES OF FREEDOM: 3 TRANS + 3 ROT)
      // =========================================================================
      if (physics.modeBlend < 0.98) {
        ctx.save();
        ctx.globalAlpha = 1.0 - physics.modeBlend;

        const pSub = physics.physSubmode;
        const allowTrans = pSub === 'ALL' || pSub === 'TRANS';
        const allowRot = pSub === 'ALL' || pSub === 'ROT';

        // 3D Translational Oscillation of Center of Mass (Tx, Ty, Tz)
        const transX = allowTrans ? Math.sin(physics.transPhase * 1.2) * (scaleRadius * 0.24) : 0;
        const transY = allowTrans ? Math.cos(physics.transPhase * 0.9) * (scaleRadius * 0.18) : 0;

        // Origin of the rigid body
        const oX = centerX + transX;
        const oY = centerY + transY;

        // Record trajectory trail for translation
        if (allowTrans && !physics.isPaused) {
          physics.trailPoints.push({ x: oX, y: oY, time: physics.timeSec });
          if (physics.trailPoints.length > 45) {
            physics.trailPoints.shift();
          }
        }

        // Draw Phase-Space Trajectory Trail
        if (physics.trailPoints.length > 2) {
          ctx.beginPath();
          for (let i = 0; i < physics.trailPoints.length; i++) {
            const pt = physics.trailPoints[i];
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.strokeStyle = 'rgba(255, 154, 46, 0.25)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 3 Rotational Gimbal Rings (Rx = Roll, Ry = Pitch, Rz = Yaw)
        const rR = scaleRadius * 0.85;

        // Gimbal 1: Rx (Roll Ring around X-axis)
        ctx.save();
        ctx.translate(oX, oY);
        const r1Angle = allowRot ? physics.timeSec * 0.8 : 0;
        ctx.beginPath();
        ctx.ellipse(0, 0, rR * 1.15, rR * 0.42, totalAngleX + r1Angle, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 154, 46, 0.45)';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Roll Axis Label
        ctx.font = '600 9px JetBrains Mono, monospace';
        ctx.fillStyle = '#FF9A2E';
        ctx.fillText('R_x [ROLL]', rR * 1.12, 10);
        ctx.restore();

        // Gimbal 2: Ry (Pitch Ring around Y-axis)
        ctx.save();
        ctx.translate(oX, oY);
        const r2Angle = allowRot ? -physics.timeSec * 0.6 : 0;
        ctx.beginPath();
        ctx.ellipse(0, 0, rR * 0.38, rR * 1.12, totalAngleY + r2Angle, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(84, 185, 255, 0.45)';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.font = '600 9px JetBrains Mono, monospace';
        ctx.fillStyle = '#54B9FF';
        ctx.fillText('R_y [PITCH]', -40, -rR * 1.08);
        ctx.restore();

        // Gimbal 3: Rz (Yaw Ring around Z-axis)
        ctx.save();
        ctx.translate(oX, oY);
        const r3Angle = allowRot ? physics.timeSec * 1.1 : 0;
        ctx.beginPath();
        ctx.arc(0, 0, rR * 0.98, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(120, 240, 160, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '600 9px JetBrains Mono, monospace';
        ctx.fillStyle = '#78F0A0';
        ctx.fillText('R_z [YAW]', rR * 0.72, -rR * 0.72);
        ctx.restore();

        // 3 Orthogonal Coordinate Axes (Tx, Ty, Tz translation vectors)
        const axisLen = scaleRadius * 0.95;
        const axes = [
          { dir: [axisLen, 0, 0], color: '#FF5C5C', label: 'T_x' }, // X-axis
          { dir: [0, -axisLen, 0], color: '#78F0A0', label: 'T_y' }, // Y-axis
          { dir: [0, 0, axisLen], color: '#54B9FF', label: 'T_z' }, // Z-axis
        ];

        for (let a = 0; a < axes.length; a++) {
          const ax = axes[a];
          let [x1, y1, z1] = rotateY(ax.dir[0], ax.dir[1], ax.dir[2], totalAngleY);
          let [x2, y2, z2] = rotateX(x1, y1, z1, totalAngleX);

          const scale = fov / (z2 + fov);
          const px = oX + x2 * scale;
          const py = oY + y2 * scale;

          // Axis Shaft
          ctx.beginPath();
          ctx.moveTo(oX, oY);
          ctx.lineTo(px, py);
          ctx.strokeStyle = ax.color;
          ctx.lineWidth = 2.0;
          ctx.stroke();

          // Arrowhead / Node tip
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = ax.color;
          ctx.shadowColor = ax.color;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Label
          ctx.font = 'bold 10px JetBrains Mono, monospace';
          ctx.fillStyle = ax.color;
          ctx.fillText(ax.label, px + 8, py + 4);
        }

        // Central Rigid Body Inertial Core
        const coreRadius = Math.max(6, 10 * Math.min(1.6, Math.max(0.7, Math.sqrt(currentZoom))));
        ctx.beginPath();
        ctx.arc(oX, oY, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#FF9A2E';
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
      }

      // =========================================================================
      // RENDER MODE C: CHEMISTRY (MOLECULAR DYNAMICS & VIBRATIONAL NORMAL MODES)
      // Water Molecule (H₂O): Central Oxygen (O) linked to two single Hydrogen atoms (H + H)
      // 3N = 9 Total DoF: 3 Trans + 3 Rot + (3N - 6 = 3) Vibrational Normal Modes
      // =========================================================================
      if (physics.modeBlend > 0.02) {
        ctx.save();
        ctx.globalAlpha = physics.modeBlend;

        const cSub = physics.chemSubmode;
        const phase = physics.vibPhase;

        // Vibrational displacements:
        // 1. Symmetric Stretch: both single O-H bonds elongate simultaneously in phase
        const symDisp = (cSub === 'ALL' || cSub === 'SYM_STRETCH') ? Math.sin(phase) * 18 * currentZoom : 0;

        // 2. Bending / Scissoring: bond angle expands/contracts harmonically around 104.5 deg
        const bendDisp = (cSub === 'ALL' || cSub === 'BEND') ? Math.cos(phase * 0.9) * 0.22 : 0;

        // 3. Asymmetric Stretch: one single O-H bond extends while the other compresses
        const asymDisp = (cSub === 'ALL' || cSub === 'ASYM_STRETCH') ? Math.sin(phase * 1.3) * 16 * currentZoom : 0;

        // Equilibrium geometry: Bent water molecule (104.5 degrees)
        const baseBondLen = scaleRadius * 0.65;
        const baseAngleRad = (104.5 * Math.PI) / 180 + bendDisp;
        const halfAngle = baseAngleRad / 2;

        const bond1Len = baseBondLen + symDisp + asymDisp;
        const bond2Len = baseBondLen + symDisp - asymDisp;

        const atomRadiusScale = Math.min(1.5, Math.max(0.75, Math.sqrt(currentZoom)));

        // 3 Individual Atoms in 3D:
        // Central Oxygen atom (O, mass 16.00 u)
        // Two individual, single Hydrogen atoms (H, mass 1.008 u each), NOT diatomic H₂!
        const atoms = [
          {
            name: 'O',
            subLabel: 'OXYGEN CORE',
            mass: '16.00 u',
            role: 'CENTRAL OXYGEN ATOM (O) [Z=8]',
            radius: 19 * atomRadiusScale,
            color: '#FF9A2E',
            glow: '#FF9A2E',
            pos: [0, 20 * currentZoom, 0],
          },
          {
            name: 'H',
            subLabel: 'HYDROGEN 1',
            mass: '1.008 u',
            role: 'SINGLE HYDROGEN ATOM (H) [Z=1]',
            radius: 12 * atomRadiusScale,
            color: '#FFFFFF',
            glow: '#54B9FF',
            pos: [
              -Math.sin(halfAngle) * bond1Len,
              20 * currentZoom - Math.cos(halfAngle) * bond1Len,
              Math.sin(phase * 0.5) * 6 * currentZoom,
            ],
          },
          {
            name: 'H',
            subLabel: 'HYDROGEN 2',
            mass: '1.008 u',
            role: 'SINGLE HYDROGEN ATOM (H) [Z=1]',
            radius: 12 * atomRadiusScale,
            color: '#FFFFFF',
            glow: '#54B9FF',
            pos: [
              Math.sin(halfAngle) * bond2Len,
              20 * currentZoom - Math.cos(halfAngle) * bond2Len,
              -Math.sin(phase * 0.5) * 6 * currentZoom,
            ],
          },
        ];

        // Project atoms into 2D screen space
        const projAtoms = atoms.map((atom) => {
          let [x1, y1, z1] = rotateY(atom.pos[0], atom.pos[1], atom.pos[2], totalAngleY);
          let [x2, y2, z2] = rotateX(x1, y1, z1, totalAngleX);

          const scale = fov / (z2 + fov);
          return {
            ...atom,
            x: centerX + x2 * scale,
            y: centerY + y2 * scale,
            scale,
            z: z2,
          };
        });

        // 1. Draw Covalent Harmonic Spring Bonds (Coil representation between O and each single H)
        const drawSpringBond = (p1, p2, bondNum) => {
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);

          ctx.save();
          ctx.translate(p1.x, p1.y);
          ctx.rotate(angle);

          // Harmonic spring coils
          const coils = 9;
          const coilWidth = 7 * Math.min(1.4, Math.max(0.7, currentZoom));
          ctx.beginPath();
          ctx.moveTo(0, 0);

          for (let i = 0; i <= coils; i++) {
            const cx = (dist / coils) * i;
            const cy = i % 2 === 0 ? -coilWidth : coilWidth;
            if (i === 0 || i === coils) ctx.lineTo(cx, 0);
            else ctx.lineTo(cx, cy);
          }

          ctx.strokeStyle = 'rgba(255, 154, 46, 0.65)';
          ctx.lineWidth = 2.0;
          ctx.stroke();

          // Equilibrium line inside
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(dist, 0);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Subtle single bond label
          ctx.font = '600 8.5px JetBrains Mono, monospace';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fillText(`O—H SINGLE BOND`, dist * 0.25, -coilWidth - 4);

          ctx.restore();
        };

        drawSpringBond(projAtoms[0], projAtoms[1], 1);
        drawSpringBond(projAtoms[0], projAtoms[2], 2);

        // 2. Draw Bond Angle Sector Arc (104.5 deg equilibrium)
        const arcRadius = 36 * Math.min(1.6, Math.max(0.65, currentZoom));
        ctx.save();
        ctx.beginPath();
        ctx.arc(projAtoms[0].x, projAtoms[0].y, arcRadius, -Math.PI / 2 - halfAngle, -Math.PI / 2 + halfAngle);
        ctx.strokeStyle = 'rgba(84, 185, 255, 0.45)';
        ctx.lineWidth = 1.3;
        ctx.setLineDash([2, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '600 10px JetBrains Mono, monospace';
        ctx.fillStyle = '#54B9FF';
        const liveAngleDeg = (baseAngleRad * 180 / Math.PI).toFixed(1);
        ctx.fillText(`θ(H-O-H): ${liveAngleDeg}°`, projAtoms[0].x - 38, projAtoms[0].y - arcRadius - 8);
        ctx.restore();

        // 3. Draw Dynamic Dipole Moment Vector (μ)
        const dipoleLen = (48 + Math.sin(phase) * 6) * currentZoom;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(projAtoms[0].x, projAtoms[0].y);
        ctx.lineTo(projAtoms[0].x, projAtoms[0].y - dipoleLen);
        ctx.strokeStyle = '#FF5C5C';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(projAtoms[0].x, projAtoms[0].y - dipoleLen, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#FF5C5C';
        ctx.fill();

        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.fillStyle = '#FF5C5C';
        ctx.fillText('μ [NET DIPOLE]', projAtoms[0].x + 6, projAtoms[0].y - dipoleLen + 3);
        ctx.restore();

        // 4. Draw Atoms (Single Oxygen and Two Single Hydrogens)
        // Sort back to front
        const sortedAtoms = [...projAtoms].sort((a, b) => a.z - b.z);

        for (let i = 0; i < sortedAtoms.length; i++) {
          const at = sortedAtoms[i];
          const r = at.radius * at.scale;

          // Outer Glow
          ctx.beginPath();
          ctx.arc(at.x, at.y, r + 8, 0, Math.PI * 2);
          ctx.fillStyle = at.name === 'O' ? 'rgba(255, 154, 46, 0.18)' : 'rgba(84, 185, 255, 0.18)';
          ctx.fill();

          // Main Sphere
          ctx.beginPath();
          ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
          ctx.fillStyle = at.color;
          ctx.shadowColor = at.glow;
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Inner Specular Highlight
          ctx.beginPath();
          ctx.arc(at.x - r * 0.3, at.y - r * 0.3, r * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fill();

          // Chemical Label: 'O' or 'H' (both Hydrogens clearly rendered as individual 'H')
          const fontSize = Math.round(11 * Math.min(1.5, Math.max(0.8, at.scale)));
          ctx.font = `bold ${fontSize}px JetBrains Mono, monospace`;
          ctx.fillStyle = '#111111';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(at.name, at.x, at.y);

          // Precision annotation beside atom clarifying individual atomic species
          ctx.font = '600 8.5px JetBrains Mono, monospace';
          ctx.fillStyle = at.name === 'O' ? '#FF9A2E' : '#54B9FF';
          ctx.textAlign = 'left';
          ctx.fillText(at.name === 'O' ? 'O (16.00u)' : 'Single H (1.008u)', at.x + r + 5, at.y + 3);

          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('wheel', onWheel);
    };
  }, []); // Run continuous animation loop once on mount!

  return (
    <div className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl overflow-hidden font-sans space-y-0 transition-all shadow-sm">
      {/* 1. Header Toolbar: Mode Switcher [P] / [C], Wheel Mode Toggle, Velocity & Zoom Controls */}
      <div className="px-6 py-4 bg-surface-container border-b border-outline-variant/30 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Mode Title & Dual Mode Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-container shadow-[0_0_8px_#ff9a2e]" />
            <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
              DEGREES OF FREEDOM LAB
            </span>
          </div>

          {/* Segmented Mode Selector: MODE P | MODE C */}
          <div className="flex items-center gap-1 bg-surface p-1 rounded-full border border-outline-variant/40">
            <button
              onClick={() => setMode('P')}
              className={`px-3.5 py-1 rounded-full font-mono text-[11px] font-bold tracking-wider transition-all cursor-pointer ${
                mode === 'P'
                  ? 'bg-inverse-surface text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              MODE [P] · PHYSICS
            </button>
            <button
              onClick={() => setMode('C')}
              className={`px-3.5 py-1 rounded-full font-mono text-[11px] font-bold tracking-wider transition-all cursor-pointer ${
                mode === 'C'
                  ? 'bg-primary-container text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              MODE [C] · CHEMISTRY
            </button>
          </div>
        </div>

        {/* Right: Wheel Toggle, Zoom Buttons & Velocity Controls */}
        <div className="flex items-center gap-3 font-mono text-xs text-on-surface-variant flex-wrap">
          {/* Wheel Mode Toggle Switch */}
          <div className="flex items-center gap-1 bg-surface p-1 rounded-full border border-outline-variant/40">
            <button
              onClick={() => setWheelZoomEnabled(false)}
              className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                !wheelZoomEnabled
                  ? 'bg-inverse-surface text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Default Mode: Mouse wheel scrolls the webpage normally without activating zoom"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${!wheelZoomEnabled ? 'bg-primary-container' : 'bg-outline-variant'}`} />
              <span>PAGE SCROLL (DEFAULT)</span>
            </button>
            <button
              onClick={() => setWheelZoomEnabled(true)}
              className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                wheelZoomEnabled
                  ? 'bg-primary-container text-black font-extrabold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Activate Zoom: Mouse wheel zooms the 3D visual element"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${wheelZoomEnabled ? 'bg-black' : 'bg-outline-variant'}`} />
              <span>ZOOM 3D</span>
            </button>
          </div>

          {/* Zoom Buttons Cluster */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-outline-variant/30">
            <span className="text-[10px] uppercase font-bold tracking-wider">ZOOM:</span>
            <button
              onClick={() => handleZoomChange(zoom - 0.2)}
              className="w-6 h-6 flex items-center justify-center rounded border border-outline-variant/40 hover:bg-surface-container-high text-xs cursor-pointer font-bold transition-colors"
              title="Zoom Out (−)"
            >
              −
            </button>
            <button
              onClick={() => handleZoomChange(1.0)}
              className="px-2 h-6 flex items-center justify-center rounded border border-outline-variant/40 hover:bg-surface-container-high text-[10px] cursor-pointer font-mono font-bold transition-colors"
              title="Reset to 100% Zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => handleZoomChange(zoom + 0.2)}
              className="w-6 h-6 flex items-center justify-center rounded border border-outline-variant/40 hover:bg-surface-container-high text-xs cursor-pointer font-bold transition-colors"
              title="Zoom In (+)"
            >
              +
            </button>
          </div>

          {/* Velocity Adjustment Controls */}
          <div className="flex items-center gap-2 pl-2 border-l border-outline-variant/30">
            <span className="text-[10px] uppercase font-bold tracking-wider">SPEED:</span>
            
            {/* Preset Buttons */}
            <div className="flex items-center gap-1">
              {[
                { val: 0.25, label: '0.25×' },
                { val: 1.0, label: '1.0×' },
                { val: 2.2, label: '2.2×' },
              ].map((preset) => (
                <button
                  key={preset.val}
                  onClick={() => setVelocity(preset.val)}
                  className={`px-2 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
                    velocity === preset.val
                      ? 'bg-on-surface text-surface font-bold'
                      : 'border border-outline-variant/40 hover:bg-surface-container-high'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Precision Velocity Slider */}
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.05"
              value={velocity}
              onChange={(e) => setVelocity(parseFloat(e.target.value))}
              className="w-16 accent-primary-container cursor-pointer"
              title={`Speed: ${velocity.toFixed(2)}x`}
            />

            {/* Pause / Resume */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="px-2.5 py-1 rounded border border-outline-variant/40 text-[10px] hover:text-on-surface cursor-pointer transition-colors font-bold"
              title={isPaused ? 'Resume dynamics' : 'Pause frame'}
            >
              {isPaused ? '▶' : '⏸'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Interactive 3D Canvas Stage */}
      <div
        ref={containerRef}
        className="relative w-full h-[400px] md:h-[460px] bg-[#161717] overflow-hidden select-none"
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair z-0" />

        {/* Floating Top Telemetry Readout */}
        <div className="absolute top-4 left-6 z-10 pointer-events-none font-mono text-[10px] text-white/70 space-y-1">
          {mode === 'P' ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[#FF9A2E] font-bold text-xs">CLASSICAL RIGID BODY // 6 DEGREES OF FREEDOM</span>
                <span className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-white">f = 3N - k</span>
              </div>
              <p className="text-white/40">
                3 TRANSLATIONAL (Tx, Ty, Tz) + 3 ROTATIONAL (Rx Roll, Ry Pitch, Rz Yaw)
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[#54B9FF] font-bold text-xs">MOLECULAR DYNAMICS // 3N DEGREES OF FREEDOM</span>
                <span className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-white font-mono">N = 3 ATOMS (1×O + 2×H) → 9 DoF</span>
              </div>
              <p className="text-white/40">
                WATER (H₂O): 2 INDIVIDUAL HYDROGEN ATOMS (H) LINKED TO 1 OXYGEN (O) · 3 TRANS + 3 ROT + 3 VIBRATIONAL MODES
              </p>
            </>
          )}
        </div>

        {/* Floating Right Mode Inspector Filter */}
        <div className="absolute top-4 right-6 z-20 font-mono text-[10px]">
          {mode === 'P' ? (
            <div className="bg-black/60 backdrop-blur-md border border-white/15 p-2.5 rounded-xl space-y-1 text-white">
              <span className="text-[#888888] block text-[9px] uppercase font-bold">ISOLATE DOF</span>
              <div className="flex gap-1">
                {[
                  { id: 'ALL', label: 'FULL 6 DoF' },
                  { id: 'TRANS', label: 'TRANSLATION (3)' },
                  { id: 'ROT', label: 'ROTATION (3)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActivePhysSubmode(item.id)}
                    className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                      activePhysSubmode === item.id
                        ? 'bg-[#FF9A2E] text-black font-bold'
                        : 'border border-white/20 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-black/60 backdrop-blur-md border border-white/15 p-2.5 rounded-xl space-y-1 text-white">
              <span className="text-[#888888] block text-[9px] uppercase font-bold">NORMAL VIBRATIONAL MODES</span>
              <div className="flex flex-wrap gap-1 max-w-[280px]">
                {[
                  { id: 'ALL', label: 'ALL 3N-6 MODES' },
                  { id: 'SYM_STRETCH', label: 'ν₁ SYM STRETCH' },
                  { id: 'BEND', label: 'ν₂ SCISSOR BEND' },
                  { id: 'ASYM_STRETCH', label: 'ν₃ ASYM STRETCH' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveChemSubmode(item.id)}
                    className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                      activeChemSubmode === item.id
                        ? 'bg-[#54B9FF] text-black font-bold'
                        : 'border border-white/20 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floating Bottom-Right Canvas HUD: Quick Zoom Controls & Wheel Mode Indicator */}
        <div className="absolute bottom-3 right-6 z-20 flex items-center gap-2 bg-black/75 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl font-mono text-[10px] text-white shadow-lg">
          {/* Wheel Mode Quick Toggle Pill */}
          <button
            onClick={() => setWheelZoomEnabled(!wheelZoomEnabled)}
            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              wheelZoomEnabled
                ? 'bg-primary-container text-black shadow-xs font-extrabold'
                : 'bg-white/15 text-white/80 hover:bg-white/25 hover:text-white'
            }`}
            title={
              wheelZoomEnabled
                ? 'Wheel Zoom is ON. Click to switch to normal page scrolling.'
                : 'Page Scroll is ON (Default). Click to activate 3D canvas zoom with mouse wheel.'
            }
          >
            <span className={`w-1.5 h-1.5 rounded-full ${wheelZoomEnabled ? 'bg-black' : 'bg-green-400'}`} />
            <span>{wheelZoomEnabled ? 'WHEEL: ZOOM 3D' : 'WHEEL: SCROLL PAGE'}</span>
          </button>

          <span className="text-white/20">|</span>

          <button
            onClick={() => handleZoomChange(zoom - 0.2)}
            className="w-5 h-5 flex items-center justify-center rounded bg-white/10 hover:bg-white/25 cursor-pointer font-bold text-xs transition-colors"
            title="Zoom Out (−)"
          >
            −
          </button>
          <span className="text-primary-container font-bold w-11 text-center font-mono">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoomChange(zoom + 0.2)}
            className="w-5 h-5 flex items-center justify-center rounded bg-white/10 hover:bg-white/25 cursor-pointer font-bold text-xs transition-colors"
            title="Zoom In (+)"
          >
            +
          </button>
          <button
            onClick={() => handleZoomChange(1.0)}
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/25 text-[9px] cursor-pointer text-white/80 transition-colors"
            title="Reset Zoom to 100%"
          >
            RESET
          </button>
        </div>

        {/* Bottom Left Guidance Pill */}
        <div className="absolute bottom-3 left-6 z-10 font-mono text-[9px] text-[#888888] pointer-events-none">
          <span>DRAG TO ORIENT · {wheelZoomEnabled ? 'MOUSE WHEEL ZOOMS 3D' : 'MOUSE WHEEL SCROLLS PAGE (DEFAULT)'} ({Math.round(zoom * 100)}%) · 60 FPS</span>
        </div>
      </div>

      {/* 3. Collapsible Mathematical Definition & Theoretical Framework Section */}
      <div className="border-t border-outline-variant/30 bg-surface">
        <button
          onClick={() => setIsMathDefExpanded(!isMathDefExpanded)}
          className="w-full px-6 py-3.5 flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer group select-none text-left"
          aria-expanded={isMathDefExpanded}
        >
          <div className="flex items-center gap-3 font-mono text-xs">
            <span
              className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs transition-all ${
                isMathDefExpanded
                  ? 'bg-primary-container text-black shadow-xs'
                  : 'bg-surface-container-high text-primary-container border border-outline-variant/40 group-hover:bg-primary-container group-hover:text-black'
              }`}
            >
              {isMathDefExpanded ? '−' : '+'}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-on-surface tracking-wider uppercase text-[11px]">
                MATHEMATICAL DEFINITION & THEORETICAL FRAMEWORK
              </span>
              <span className="text-[10px] text-on-surface-variant font-normal">
                {mode === 'P'
                  ? '· 6 RIGID DEGREES OF FREEDOM & EQUIPARTITION'
                  : '· 3N VIBRATIONAL NORMAL MODES & SELECTION RULES'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] text-on-surface-variant group-hover:text-on-surface transition-colors">
            <span>{isMathDefExpanded ? 'COLLAPSE' : 'EXPAND TO READ'}</span>
            <span className="text-primary-container transition-transform duration-200">
              {isMathDefExpanded ? '▲' : '▼'}
            </span>
          </div>
        </button>

        {isMathDefExpanded && (
          <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs border-t border-outline-variant/20 animate-fade-in">
            <div className="space-y-1">
              <span className="text-[10px] text-secondary tracking-widest uppercase font-bold block">
                MATHEMATICAL DEFINITION // 01
              </span>
              <p className="font-semibold text-on-surface text-sm">
                {mode === 'P' ? 'Rigid Body Phase Space' : 'Triatomic Molecular Structure'}
              </p>
              <p className="text-on-surface-variant text-[11px] leading-relaxed">
                {mode === 'P'
                  ? 'In physical mechanics, 6 independent coordinates (x, y, z, roll, pitch, yaw) completely determine the rigid body. By the Equipartition Theorem, each quadratic DoF stores 1/2 k_B T of thermal energy.'
                  : 'In water (H₂O), two individual, single Hydrogen atoms (H) are covalently linked to a central Oxygen atom (O) at an equilibrium angle of 104.5° (not diatomic H₂). With N = 3 individual atoms, 3N = 9 total coordinates yield 3 translational, 3 rotational, and exactly 3N - 6 = 3 vibrational normal modes.'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-secondary tracking-widest uppercase font-bold block">
                {mode === 'P' ? 'EQUIPARTITION ENERGETICS // 02' : 'INFRARED SPECTROSCOPY // 02'}
              </span>
              <p className="font-semibold text-on-surface text-sm">
                {mode === 'P' ? 'U = (f / 2) · k_B T' : 'Dipole Derivative (dμ / dQ ≠ 0)'}
              </p>
              <p className="text-on-surface-variant text-[11px] leading-relaxed">
                {mode === 'P'
                  ? 'Gas heat capacities (Cv = 3R for non-linear rigid molecules) derive directly from active kinetic degrees of freedom, illustrating how macroscopic thermodynamics emerges from microstates.'
                  : 'A vibrational mode is IR-active only if the molecular dipole moment changes during oscillation. The two O—H single bonds participate in symmetric stretch (ν₁ at 3657 cm⁻¹), scissor bending (ν₂ at 1595 cm⁻¹), and asymmetric stretch (ν₃ at 3756 cm⁻¹).'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-secondary tracking-widest uppercase font-bold block">
                RESEARCH APPLICATION // 03
              </span>
              <p className="font-semibold text-on-surface text-sm">
                Dimensionality & Vector Embeddings
              </p>
              <p className="text-on-surface-variant text-[11px] leading-relaxed">
                Just as physical systems reduce infinite possibilities to finite DoFs, Papermind embeds complex scientific papers into 1,536 orthogonal latent degrees of freedom to enable precise geometric reasoning.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DegreesOfFreedomVisualizer;
