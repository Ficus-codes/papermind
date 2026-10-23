import React from 'react';

/**
 * Papermind "Twin Wings" Brand Icon
 * Symmetrical open manuscript folios with radiant central amber ignition spine
 */
const PapermindLogo = ({ size = 24, className = '' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={`shrink-0 ${className}`}
      aria-label="Papermind Logo"
    >
      <defs>
        <linearGradient id="logoBgGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#191B1C" />
          <stop offset="100%" stopColor="#101112" />
        </linearGradient>

        <linearGradient id="logoLeftWing" x1="12" y1="14" x2="31" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2DFDC" />
        </linearGradient>

        <linearGradient id="logoLeftFold" x1="16" y1="34" x2="31" y2="49" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C2BEB9" />
          <stop offset="100%" stopColor="#9E9A95" />
        </linearGradient>

        <linearGradient id="logoRightWing" x1="52" y1="14" x2="33" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FAF8F5" />
          <stop offset="100%" stopColor="#D9D5D0" />
        </linearGradient>

        <linearGradient id="logoRightFold" x1="48" y1="34" x2="33" y2="49" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B8B4AF" />
          <stop offset="100%" stopColor="#918D88" />
        </linearGradient>

        <linearGradient id="logoAmberCore" x1="32" y1="8" x2="32" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFC15E" />
          <stop offset="40%" stopColor="#FF9A2E" />
          <stop offset="100%" stopColor="#E67E00" />
        </linearGradient>
      </defs>

      {/* Rounded Icon Tile */}
      <rect width="64" height="64" rx="15" fill="url(#logoBgGrad)" />
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="14.25" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.5" />

      {/* Central Ambient Glow */}
      <circle cx="32" cy="30" r="16" fill="#FF9A2E" opacity="0.14" />

      {/* Left Wing (Manuscript Page) */}
      <polygon points="12,20 27,14 30.5,35 16,42" fill="url(#logoLeftWing)" />
      <polygon points="16,42 30.5,35 30.5,49" fill="url(#logoLeftFold)" />

      {/* Right Wing (Symmetrical Folio) */}
      <polygon points="52,20 37,14 33.5,35 48,42" fill="url(#logoRightWing)" />
      <polygon points="48,42 33.5,35 33.5,49" fill="url(#logoRightFold)" />

      {/* Paper Spine Seams */}
      <line x1="27" y1="14" x2="30.5" y2="35" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
      <line x1="37" y1="14" x2="33.5" y2="35" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />

      {/* Central Amber Spine Laser & Apex Spark */}
      <line x1="32" y1="19" x2="32" y2="49" stroke="url(#logoAmberCore)" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="32" y1="22" x2="32" y2="45" stroke="#FFF7D6" strokeWidth="1.1" strokeLinecap="round" />

      {/* Apex Spark */}
      <polygon points="32,8 35.5,14 32,20 28.5,14" fill="#FFC15E" />
      <circle cx="32" cy="14" r="1.4" fill="#FFFFFF" />

      {/* Bottom Anchor Vertex */}
      <circle cx="32" cy="49" r="2.2" fill="#FF9A2E" />
      <circle cx="32" cy="49" r="1" fill="#FFF7D6" />
    </svg>
  );
};

export default PapermindLogo;
