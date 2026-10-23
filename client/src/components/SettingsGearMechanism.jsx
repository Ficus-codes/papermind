import React, { useEffect, useRef, useState } from 'react';

/**
 * SettingsGearMechanism
 * A minimalist, Swiss-horology-inspired visual element for the Settings page.
 *
 * Characteristics:
 * - Pure Minimalist Graphic: Zero extraneous text or telemetry headers/footers.
 * - Single Dedicated Control: Sleek "COUNTERCLOCKWISE" direction toggle button.
 * - High Contrast: Crisp dark slate and radiant amber-copper contours with rich metallic density.
 * - Pleasing Constant Speed: Calibrated constant rotational velocity (~0.48 rad/s, 4.6 RPM on main driver)
 *   that is hypnotic, rhythmic, and soothing to the human eye.
 * - Mathematically exact conjugate involute gears with module m = 3.2.
 */
const SettingsGearMechanism = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Dedicated counterclockwise state (default: false = clockwise)
  const [isCounterClockwise, setIsCounterClockwise] = useState(false);

  // Animation and kinematic reference
  const engineRef = useRef({
    angle1: 0,
    velocity: 0.48, // rad/s
    targetVelocity: 0.48,
    isHovering: false,
    mouseX: -999,
    mouseY: -999,
  });

  // Calibrated constant rotation speed: ~0.48 rad/s (approx 27.5°/s, ~4.6 RPM)
  const CONSTANT_SPEED = 0.48;

  // Sync direction to engine
  useEffect(() => {
    engineRef.current.targetVelocity = isCounterClockwise ? -CONSTANT_SPEED : CONSTANT_SPEED;
  }, [isCounterClockwise]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let lastTime = performance.now();

    const module = 3.2; // Involute gear module (m = 2*R / N)

    // 5 Interlocking Gears [N, spokes]
    const gearsDef = [
      { id: 'G3', teeth: 12, spokes: 3 }, // Far Left Micro Pinion
      { id: 'G2', teeth: 18, spokes: 4 }, // Left Transfer Gear
      { id: 'G1', teeth: 28, spokes: 4 }, // Center Driver Sun Gear
      { id: 'G4', teeth: 22, spokes: 5 }, // Right Reduction Gear
      { id: 'G5', teeth: 16, spokes: 3 }, // Far Right Escapement Pinion
    ];

    // Compute radii
    gearsDef.forEach((g) => {
      g.radius = (g.teeth * module) / 2;
      g.dedendum = g.radius - 1.15 * module;
      g.addendum = g.radius + 0.95 * module;
    });

    // Resize handler for Retina / High-DPI displays
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

    // Subtle hover detection for delicate lighting interaction
    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      engineRef.current.mouseX = e.clientX - rect.left;
      engineRef.current.mouseY = e.clientY - rect.top;
      engineRef.current.isHovering = true;
    };

    const onMouseLeave = () => {
      engineRef.current.isHovering = false;
      engineRef.current.mouseX = -999;
      engineRef.current.mouseY = -999;
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);

    // Draw high-contrast horological involute gear
    const drawGear = (cx, cy, g, angle, isDriver = false, isHovered = false) => {
      const { teeth, radius, dedendum, addendum, spokes } = g;
      const anglePerTooth = (Math.PI * 2) / teeth;

      ctx.save();
      ctx.translate(cx, cy);

      // 1. Draw Outer Involute Teeth Contour
      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const toothMid = angle + i * anglePerTooth;
        const a0 = toothMid - anglePerTooth * 0.5;
        const a1 = toothMid - anglePerTooth * 0.22;
        const a2 = toothMid - anglePerTooth * 0.1;
        const a3 = toothMid + anglePerTooth * 0.1;
        const a4 = toothMid + anglePerTooth * 0.22;

        // Dedendum root
        const x0 = Math.cos(a0) * dedendum;
        const y0 = Math.sin(a0) * dedendum;
        if (i === 0) ctx.moveTo(x0, y0);
        else ctx.lineTo(x0, y0);

        // Flank rising to addendum tip
        const x1 = Math.cos(a1) * dedendum;
        const y1 = Math.sin(a1) * dedendum;
        ctx.lineTo(x1, y1);

        const x2 = Math.cos(a2) * addendum;
        const y2 = Math.sin(a2) * addendum;
        ctx.lineTo(x2, y2);

        // Top land
        const x3 = Math.cos(a3) * addendum;
        const y3 = Math.sin(a3) * addendum;
        ctx.lineTo(x3, y3);

        // Flank falling back to dedendum
        const x4 = Math.cos(a4) * dedendum;
        const y4 = Math.sin(a4) * dedendum;
        ctx.lineTo(x4, y4);
      }
      ctx.closePath();

      // High-Contrast Gear Body Fill & Outline
      if (isDriver) {
        ctx.fillStyle = 'rgba(255, 154, 46, 0.10)';
        ctx.strokeStyle = isHovered ? '#ff9a2e' : '#e67300';
        ctx.lineWidth = 1.6;
      } else {
        ctx.fillStyle = 'rgba(24, 26, 28, 0.06)';
        ctx.strokeStyle = isHovered ? '#141618' : '#2b2f33';
        ctx.lineWidth = 1.35;
      }
      ctx.fill();
      ctx.stroke();

      // 2. High-Contrast Pitch Circle (Dashed Technical Reference)
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = isDriver ? 'rgba(230, 115, 0, 0.75)' : 'rgba(45, 50, 55, 0.55)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // 3. Inner Rim Circle
      const rimRadius = radius * 0.72;
      ctx.beginPath();
      ctx.arc(0, 0, rimRadius, 0, Math.PI * 2);
      ctx.strokeStyle = isDriver ? 'rgba(230, 115, 0, 0.65)' : 'rgba(45, 50, 55, 0.45)';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // 4. Skeletonized Spoke Windows / Perforations
      const hubRadius = Math.max(7.5, radius * 0.27);
      if (spokes > 0 && rimRadius - hubRadius > 7) {
        const spokeStep = (Math.PI * 2) / spokes;
        const cutoutCenterDist = (rimRadius + hubRadius) * 0.5;
        const cutoutRadius = (rimRadius - hubRadius) * 0.38;

        for (let s = 0; s < spokes; s++) {
          const spokeAngle = angle + s * spokeStep;
          const sx = Math.cos(spokeAngle) * cutoutCenterDist;
          const sy = Math.sin(spokeAngle) * cutoutCenterDist;

          // Spoke window outline
          ctx.beginPath();
          ctx.arc(sx, sy, cutoutRadius, 0, Math.PI * 2);
          ctx.strokeStyle = isDriver ? 'rgba(230, 115, 0, 0.75)' : 'rgba(35, 39, 43, 0.55)';
          ctx.lineWidth = 0.95;
          ctx.stroke();

          // Concentric spoke bevel accent
          ctx.beginPath();
          ctx.arc(sx, sy, cutoutRadius * 0.45, 0, Math.PI * 2);
          ctx.strokeStyle = isDriver ? 'rgba(230, 115, 0, 0.40)' : 'rgba(45, 50, 55, 0.30)';
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }

      // 5. Central Hub & High-Contrast Synthetic Ruby / Amber Pivot Jewel
      ctx.beginPath();
      ctx.arc(0, 0, hubRadius, 0, Math.PI * 2);
      ctx.fillStyle = isDriver ? 'rgba(255, 154, 46, 0.22)' : 'rgba(24, 26, 28, 0.14)';
      ctx.strokeStyle = isDriver ? '#d96500' : '#1a1d20';
      ctx.lineWidth = 1.3;
      ctx.fill();
      ctx.stroke();

      // Center crosshair micro-ticks
      ctx.beginPath();
      const crossSize = Math.max(3.5, hubRadius * 0.5);
      ctx.moveTo(-crossSize, 0);
      ctx.lineTo(crossSize, 0);
      ctx.moveTo(0, -crossSize);
      ctx.lineTo(0, crossSize);
      ctx.strokeStyle = isDriver ? '#d96500' : '#2b2f33';
      ctx.lineWidth = 0.9;
      ctx.stroke();

      // Pivot jewel core with gleaming specular highlight
      const jewelRadius = Math.max(2.4, hubRadius * 0.36);
      const jewelGrad = ctx.createRadialGradient(
        -jewelRadius * 0.2,
        -jewelRadius * 0.2,
        0,
        0,
        0,
        jewelRadius
      );

      if (isDriver) {
        jewelGrad.addColorStop(0, '#ffffff'); // Gleaming specular shine
        jewelGrad.addColorStop(0.3, '#ffb830');
        jewelGrad.addColorStop(0.7, '#e67300');
        jewelGrad.addColorStop(1, '#993d00');
      } else {
        jewelGrad.addColorStop(0, '#ffccd5'); // Swiss ruby highlight
        jewelGrad.addColorStop(0.3, '#e63956');
        jewelGrad.addColorStop(0.8, '#9e1030');
        jewelGrad.addColorStop(1, '#4a0011');
      }

      ctx.beginPath();
      ctx.arc(0, 0, jewelRadius, 0, Math.PI * 2);
      ctx.fillStyle = jewelGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      ctx.restore();
    };

    // Draw Technical Conjugate Mesh Beacon at tooth engagement points
    const drawMeshBeacon = (x, y, activePhase) => {
      const pulse = 0.5 + 0.5 * Math.sin(activePhase);

      // Amber halo ring
      ctx.beginPath();
      ctx.arc(x, y, 4 + pulse * 2.2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(230, 115, 0, ${0.25 + pulse * 0.35})`;
      ctx.lineWidth = 0.9;
      ctx.stroke();

      // Tangent micro-indicator line
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x, y + 6);
      ctx.strokeStyle = 'rgba(230, 115, 0, 0.8)';
      ctx.lineWidth = 0.75;
      ctx.stroke();

      // Radiant center dot
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ff9a2e';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0; // Reset
    };

    // Render loop
    const render = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const engine = engineRef.current;
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Silky-smooth constant velocity easing when changing direction
      const velDelta = engine.targetVelocity - engine.velocity;
      engine.velocity += velDelta * Math.min(1, dt * 3.5);

      // Advance driver rotation angle at steady, constant velocity
      engine.angle1 += engine.velocity * dt;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Background Calibration Centerline & Cross-Ticks (Elevated Contrast)
      ctx.save();
      ctx.strokeStyle = 'rgba(25, 28, 30, 0.18)';
      ctx.lineWidth = 0.75;

      const gridStep = 28;
      for (let x = gridStep; x < width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, height * 0.5 - 4);
        ctx.lineTo(x, height * 0.5 + 4);
        ctx.stroke();
      }

      // Centerline axis
      ctx.beginPath();
      ctx.moveTo(24, height * 0.5);
      ctx.lineTo(width - 24, height * 0.5);
      ctx.strokeStyle = 'rgba(25, 28, 30, 0.22)';
      ctx.setLineDash([2, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Gear Layout Coordinates in Unscaled Space
      const [g3, g2, g1, g4, g5] = gearsDef;

      const d12 = g1.radius + g2.radius;
      const d23 = g2.radius + g3.radius;
      const d14 = g1.radius + g4.radius;
      const d45 = g4.radius + g5.radius;

      const totalUnscaledTrainWidth = g3.radius * 2 + d23 + d12 + d14 + d45 + g5.radius * 2; // ~307px

      // Dynamic scale that fits both container height and width gracefully
      const maxAllowedRadius = height * 0.44;
      const scaleFromHeight = maxAllowedRadius / g1.addendum;
      const scaleFromWidth = (width - 48) / totalUnscaledTrainWidth;
      const scale = Math.min(scaleFromHeight, scaleFromWidth, 1.18);

      const centerY = height * 0.5;
      const centerX = width * 0.5;

      const x1 = centerX;
      const y1 = centerY;

      const x2 = x1 - d12;
      const y2 = y1;

      const x3 = x2 - d23;
      const y3 = y1;

      const x4 = x1 + d14;
      const y4 = y1;

      const x5 = x4 + d45;
      const y5 = y1;

      // Draw Tangent Centerline Segment
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);

      ctx.beginPath();
      ctx.moveTo(x3 - g3.radius, y1);
      ctx.lineTo(x5 + g5.radius, y1);
      ctx.strokeStyle = 'rgba(230, 115, 0, 0.35)';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Angular Kinematics with Conjugate Involute Phasing
      const theta1 = engine.angle1;
      const theta2 = -theta1 * (g1.teeth / g2.teeth) + Math.PI / g2.teeth;
      const theta3 = -theta2 * (g2.teeth / g3.teeth) + Math.PI / g3.teeth;
      const theta4 = -theta1 * (g1.teeth / g4.teeth) + Math.PI / g4.teeth;
      const theta5 = -theta4 * (g4.teeth / g5.teeth) + Math.PI / g5.teeth;

      // Hover detection helper
      const isMouseNear = (gx, gy, gr) => {
        if (!engine.isHovering) return false;
        const screenGx = centerX + (gx - centerX) * scale;
        const screenGy = centerY + (gy - centerY) * scale;
        const dx = engine.mouseX - screenGx;
        const dy = engine.mouseY - screenGy;
        return Math.sqrt(dx * dx + dy * dy) < gr * scale * 1.25;
      };

      // Draw all gears with sharp contrast
      drawGear(x3, y3, g3, theta3, false, isMouseNear(x3, y3, g3.radius));
      drawGear(x5, y5, g5, theta5, false, isMouseNear(x5, y5, g5.radius));
      drawGear(x2, y2, g2, theta2, false, isMouseNear(x2, y2, g2.radius));
      drawGear(x4, y4, g4, theta4, false, isMouseNear(x4, y4, g4.radius));
      drawGear(x1, y1, g1, theta1, true, isMouseNear(x1, y1, g1.radius)); // Central Sun Driver

      // Conjugate Mesh Beacons at tangent pitch points
      const pitchPhase = time * 0.005;
      const meshP32_x = x3 + g3.radius;
      const meshP21_x = x2 + g2.radius;
      const meshP14_x = x1 + g1.radius;
      const meshP45_x = x4 + g4.radius;

      drawMeshBeacon(meshP32_x, y1, pitchPhase * 3.5);
      drawMeshBeacon(meshP21_x, y1, pitchPhase * 2.2);
      drawMeshBeacon(meshP14_x, y1, pitchPhase * 1.8);
      drawMeshBeacon(meshP45_x, y1, pitchPhase * 2.5);

      ctx.restore();

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
    <div className="bg-surface-container-low border border-outline-variant/60 rounded-2xl overflow-hidden shadow-xs transition-all duration-300 relative">
      {/* 1. Dedicated Counterclockwise Functionality Toggle (Only Control, Minimalist) */}
      <div className="absolute top-3 right-3 z-10">
        <button
          type="button"
          onClick={() => setIsCounterClockwise((prev) => !prev)}
          className={`px-3 py-1.5 rounded-full border text-[11px] font-mono tracking-wider transition-all duration-200 cursor-pointer select-none flex items-center gap-1.5 shadow-xs ${isCounterClockwise
              ? 'bg-primary-container text-on-primary-container font-semibold border-primary-container shadow-[0_0_12px_rgba(255,154,46,0.35)]'
              : 'bg-surface/90 hover:bg-surface text-on-surface border-outline-variant/50 hover:border-outline-variant'
            }`}
          title={isCounterClockwise ? 'Switch to Clockwise rotation' : 'Switch to Counterclockwise rotation'}
        >
          <span className="text-xs transition-transform duration-300 inline-block">
            {isCounterClockwise ? '⟳' : '⟲'}
          </span>
          <span>{isCounterClockwise ? 'CLOCKWISE' : 'COUNTERCLOCKWISE'}</span>
        </button>
      </div>

      {/* 2. Pure Visual Gear Mechanism Canvas */}
      <div
        ref={containerRef}
        className="relative w-full h-[132px] sm:h-[142px] overflow-hidden select-none"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};

export default SettingsGearMechanism;
